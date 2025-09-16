# AI Notes Generation Service for Learn-X Platform
# Integrates with existing Python microservices infrastructure
# Provides comprehensive AI-powered educational content analysis

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Union, Any
import asyncio
import json
import logging
import time
import os
import sys
import tempfile
import subprocess
from datetime import datetime, timedelta
import aiohttp
import uvicorn
from pathlib import Path

# Add the local AI service to the path
current_dir = Path(__file__).parent
backend_services_dir = current_dir.parent.parent / "backend" / "services"
sys.path.insert(0, str(backend_services_dir))

# AI/ML libraries
AI_LIBRARIES_AVAILABLE = True
try:
    import whisper
    import torch
    import transformers
    from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
    from sentence_transformers import SentenceTransformer
    import nltk
    from nltk.tokenize import sent_tokenize, word_tokenize
    from nltk.corpus import stopwords
    from nltk.stem import WordNetLemmatizer
    import spacy
    import numpy as np
    
    logger.info("✅ All AI libraries loaded successfully")
except ImportError as e:
    AI_LIBRARIES_AVAILABLE = False
    logger.warning(f"⚠️ Some AI libraries are missing: {e}")
    logger.warning("Service will start in limited mode")
    
    # Create minimal fallback classes
    class FallbackClass:
        pass
    
    # Set fallback variables
    torch = FallbackClass()
    torch.cuda = FallbackClass()
    torch.cuda.is_available = lambda: False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Learn-X AI Notes Service",
    description="AI-powered educational content analysis and note generation",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class ProcessVideoRequest(BaseModel):
    video_path: str
    title: str = ""
    subject: str = ""
    features: Optional[Dict[str, bool]] = None

class ProcessTextRequest(BaseModel):
    text: str
    title: str = ""
    subject: str = ""
    features: Optional[Dict[str, bool]] = None

class AINotesResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None

class ServiceStatus(BaseModel):
    status: str
    models_loaded: List[str]
    capabilities: List[str]
    memory_usage: Optional[Dict[str, Any]] = None

# Global AI service instance
class AINotesService:
    def __init__(self):
        self.models_loaded = {}
        self.device = "cuda" if AI_LIBRARIES_AVAILABLE and hasattr(torch, 'cuda') and torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing AI Notes Service on device: {self.device}")
        
    async def initialize_models(self):
        """Initialize AI models lazily"""
        if not AI_LIBRARIES_AVAILABLE:
            logger.warning("⚠️ AI libraries not available - running in fallback mode")
            return False
            
        try:
            logger.info("Loading AI models...")
            
            # Load Whisper for transcription
            if 'whisper' not in self.models_loaded:
                logger.info("Loading Whisper model...")
                self.models_loaded['whisper'] = whisper.load_model("base")
                
            # Load summarization model
            if 'summarizer' not in self.models_loaded:
                logger.info("Loading summarization model...")
                self.models_loaded['summarizer'] = pipeline(
                    "summarization",
                    model="facebook/bart-large-cnn",
                    device=0 if self.device == "cuda" else -1
                )
            
            # Load question generation model
            if 'question_generator' not in self.models_loaded:
                logger.info("Loading question generation model...")
                self.models_loaded['question_generator'] = pipeline(
                    "text2text-generation",
                    model="valhalla/t5-small-qg-hl",
                    device=0 if self.device == "cuda" else -1
                )
            
            # Load spaCy model
            if 'nlp' not in self.models_loaded:
                logger.info("Loading spaCy model...")
                self.models_loaded['nlp'] = spacy.load("en_core_web_sm")
            
            # Load sentence transformer
            if 'sentence_model' not in self.models_loaded:
                logger.info("Loading sentence transformer...")
                self.models_loaded['sentence_model'] = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Download NLTK data
            try:
                nltk.download('punkt', quiet=True)
                nltk.download('stopwords', quiet=True)
                nltk.download('wordnet', quiet=True)
                nltk.download('averaged_perceptron_tagger', quiet=True)
            except:
                pass
                
            logger.info("✅ All AI models loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize AI models: {e}")
            return False
    
    async def transcribe_video(self, video_path: str) -> Dict[str, Any]:
        """Transcribe video using Whisper"""
        try:
            if 'whisper' not in self.models_loaded:
                await self.initialize_models()
            
            logger.info(f"Transcribing video: {video_path}")
            
            # Extract audio if needed
            audio_path = await self.extract_audio_from_video(video_path)
            
            try:
                # Transcribe with Whisper
                result = self.models_loaded['whisper'].transcribe(
                    audio_path,
                    language="en",
                    task="transcribe",
                    verbose=False
                )
                
                # Format segments
                segments = []
                for segment in result.get('segments', []):
                    segments.append({
                        'start': segment['start'],
                        'end': segment['end'],
                        'text': segment['text'].strip(),
                        'confidence': 1.0 - segment.get('no_speech_prob', 0.0)
                    })
                
                return {
                    'text': result['text'].strip(),
                    'language': result.get('language', 'en'),
                    'segments': segments,
                    'duration': segments[-1]['end'] if segments else 0
                }
                
            finally:
                # Clean up temporary audio file
                if audio_path != video_path and os.path.exists(audio_path):
                    os.remove(audio_path)
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    async def extract_audio_from_video(self, video_path: str) -> str:
        """Extract audio from video using ffmpeg"""
        try:
            audio_path = video_path.rsplit('.', 1)[0] + '_temp_audio.wav'
            
            # Use ffmpeg to extract audio
            cmd = [
                'ffmpeg', '-i', video_path,
                '-ac', '1',  # Mono channel
                '-ar', '16000',  # 16kHz sample rate
                '-y',  # Overwrite output file
                audio_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"ffmpeg error: {stderr.decode()}")
            
            return audio_path
            
        except Exception as e:
            logger.error(f"Audio extraction failed: {e}")
            # If ffmpeg fails, try to use the video file directly
            return video_path
    
    async def analyze_text(self, text: str, title: str = "", subject: str = "") -> Dict[str, Any]:
        """Comprehensive text analysis"""
        try:
            if not self.models_loaded:
                await self.initialize_models()
            
            logger.info("Analyzing text with AI models...")
            
            # Clean text
            clean_text = self.clean_text(text)
            sentences = sent_tokenize(clean_text)
            
            # Generate analysis components
            summary = await self.generate_summary(clean_text)
            key_points = await self.extract_key_points(sentences)
            concepts = await self.extract_concepts(clean_text)
            questions = await self.generate_questions(clean_text, title, subject)
            timeline = await self.create_timeline(sentences)
            flashcards = await self.generate_flashcards(concepts, clean_text)
            
            # Calculate metadata
            difficulty = self.estimate_difficulty(clean_text)
            study_time = self.estimate_study_time(clean_text)
            topics = await self.extract_topics(clean_text, subject)
            
            return {
                'summary': summary,
                'key_points': key_points,
                'concepts': concepts,
                'questions': questions,
                'difficulty': difficulty,
                'estimated_study_time': study_time,
                'timeline': timeline,
                'flashcards': flashcards,
                'topics': topics,
                'word_count': len(clean_text.split()),
                'sentence_count': len(sentences)
            }
            
        except Exception as e:
            logger.error(f"Text analysis failed: {e}")
            raise HTTPException(status_code=500, detail=f"Text analysis failed: {str(e)}")
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        import re
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s.,!?;:()-]', '', text)
        return text.strip()
    
    async def generate_summary(self, text: str) -> str:
        """Generate text summary"""
        try:
            if 'summarizer' not in self.models_loaded:
                await self.initialize_models()
            
            # Split long text into chunks
            max_chunk_length = 1024
            chunks = [text[i:i+max_chunk_length] for i in range(0, len(text), max_chunk_length)]
            
            summaries = []
            for chunk in chunks:
                if len(chunk.strip()) < 50:
                    continue
                
                summary = self.models_loaded['summarizer'](
                    chunk,
                    max_length=150,
                    min_length=30,
                    do_sample=False
                )
                summaries.append(summary[0]['summary_text'])
            
            return ' '.join(summaries) if summaries else "Summary generation completed."
            
        except Exception as e:
            logger.warning(f"Summary generation failed: {e}")
            sentences = sent_tokenize(text)
            return '. '.join(sentences[:3]) + '.' if sentences else "Content analyzed successfully."
    
    async def extract_key_points(self, sentences: List[str]) -> List[str]:
        """Extract key points from sentences"""
        try:
            # Score sentences based on various factors
            scored_sentences = []
            
            for i, sentence in enumerate(sentences):
                score = 0
                words = sentence.lower().split()
                
                # Position score
                if i < len(sentences) * 0.2:
                    score += 2
                elif i > len(sentences) * 0.8:
                    score += 1
                
                # Length score
                if 10 <= len(words) <= 30:
                    score += 2
                elif 5 <= len(words) <= 50:
                    score += 1
                
                # Keyword score
                important_words = ['important', 'key', 'main', 'primary', 'significant', 
                                 'essential', 'crucial', 'fundamental', 'critical']
                score += sum(1 for word in important_words if word in words)
                
                scored_sentences.append((score, sentence.strip()))
            
            # Sort by score and take top sentences
            scored_sentences.sort(reverse=True, key=lambda x: x[0])
            return [sentence for score, sentence in scored_sentences[:8]]
            
        except Exception as e:
            logger.warning(f"Key point extraction failed: {e}")
            return sentences[:5] if sentences else []
    
    async def extract_concepts(self, text: str) -> List[Dict[str, str]]:
        """Extract key concepts using NLP"""
        try:
            if 'nlp' not in self.models_loaded:
                await self.initialize_models()
            
            doc = self.models_loaded['nlp'](text)
            
            concepts = []
            concept_set = set()
            
            # Extract named entities
            for ent in doc.ents:
                if ent.label_ in ['PERSON', 'ORG', 'GPE', 'EVENT', 'PRODUCT', 'WORK_OF_ART']:
                    concept_name = ent.text.strip()
                    if concept_name.lower() not in concept_set and len(concept_name) > 2:
                        concepts.append({
                            'term': concept_name,
                            'definition': f"Key concept: {concept_name} ({ent.label_})",
                            'category': ent.label_,
                            'importance': 'high'
                        })
                        concept_set.add(concept_name.lower())
            
            # Extract noun phrases
            for chunk in doc.noun_chunks:
                concept_name = chunk.text.strip()
                if (len(concept_name.split()) >= 2 and 
                    concept_name.lower() not in concept_set and 
                    len(concept_name) > 3):
                    concepts.append({
                        'term': concept_name,
                        'definition': f"Important concept related to {concept_name}",
                        'category': 'concept',
                        'importance': 'medium'
                    })
                    concept_set.add(concept_name.lower())
            
            return concepts[:15]
            
        except Exception as e:
            logger.warning(f"Concept extraction failed: {e}")
            return []
    
    async def generate_questions(self, text: str, title: str = "", subject: str = "") -> List[Dict[str, Any]]:
        """Generate questions from text"""
        try:
            if 'question_generator' not in self.models_loaded:
                await self.initialize_models()
            
            questions = []
            sentences = sent_tokenize(text)
            
            # Select important sentences for question generation
            important_sentences = sentences[:10]
            
            for i, sentence in enumerate(important_sentences):
                if len(sentence.strip()) < 20:
                    continue
                
                try:
                    question_input = f"generate question: {sentence}"
                    result = self.models_loaded['question_generator'](
                        question_input,
                        max_length=64,
                        num_return_sequences=1,
                        temperature=0.7
                    )
                    
                    question_text = result[0]['generated_text']
                    question_text = question_text.replace('question:', '').strip()
                    if not question_text.endswith('?'):
                        question_text += '?'
                    
                    questions.append({
                        'question': question_text,
                        'answer': sentence.strip(),
                        'difficulty': 'medium',
                        'type': 'conceptual',
                        'topic': subject or 'general'
                    })
                    
                except Exception as e:
                    logger.warning(f"Question generation failed for sentence {i}: {e}")
                    continue
            
            # Add manual questions
            manual_questions = [
                {
                    'question': f"What are the main topics covered in {title or 'this content'}?",
                    'answer': f"The main topics include the key concepts and ideas presented throughout {title or 'the content'}.",
                    'difficulty': 'easy',
                    'type': 'overview',
                    'topic': subject or 'general'
                }
            ]
            
            questions.extend(manual_questions)
            return questions[:10]
            
        except Exception as e:
            logger.warning(f"Question generation failed: {e}")
            return []
    
    async def create_timeline(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Create timeline/chapter structure"""
        timeline = []
        chapter_size = max(5, len(sentences) // 6)
        
        for i in range(0, len(sentences), chapter_size):
            chapter_sentences = sentences[i:i+chapter_size]
            chapter_text = ' '.join(chapter_sentences)
            
            words = chapter_text.split()[:10]
            title = ' '.join(words) + ('...' if len(chapter_text.split()) > 10 else '')
            
            timeline.append({
                'timestamp': f"{i//chapter_size * 2}:00",
                'title': title,
                'description': chapter_text[:100] + ('...' if len(chapter_text) > 100 else ''),
                'chapter': i//chapter_size + 1
            })
        
        return timeline
    
    async def generate_flashcards(self, concepts: List[Dict], text: str) -> List[Dict[str, str]]:
        """Generate flashcards from concepts"""
        flashcards = []
        
        for concept in concepts[:10]:
            term = concept['term']
            definition = concept.get('definition', '')
            
            # Try to find better definition in text
            sentences = sent_tokenize(text)
            for sentence in sentences:
                if term.lower() in sentence.lower():
                    definition = sentence.strip()
                    break
            
            flashcards.append({
                'front': f"What is {term}?",
                'back': definition,
                'category': concept.get('category', 'general'),
                'difficulty': concept.get('importance', 'medium')
            })
        
        return flashcards
    
    async def extract_topics(self, text: str, subject: str = "") -> List[str]:
        """Extract main topics"""
        try:
            if 'nlp' not in self.models_loaded:
                await self.initialize_models()
            
            doc = self.models_loaded['nlp'](text)
            topics = set()
            
            if subject:
                topics.add(subject.title())
            
            # Extract from entities and noun chunks
            for ent in doc.ents:
                if ent.label_ in ['ORG', 'EVENT', 'PRODUCT', 'WORK_OF_ART']:
                    topics.add(ent.text.title())
            
            for chunk in doc.noun_chunks:
                if len(chunk.text.split()) <= 3 and len(chunk.text) > 3:
                    topics.add(chunk.text.title())
            
            return list(topics)[:8]
            
        except Exception as e:
            logger.warning(f"Topic extraction failed: {e}")
            return [subject.title()] if subject else ["General"]
    
    def estimate_difficulty(self, text: str) -> str:
        """Estimate content difficulty"""
        words = text.split()
        sentences = sent_tokenize(text)
        
        avg_sentence_length = len(words) / len(sentences) if sentences else 0
        word_count = len(words)
        
        if avg_sentence_length > 20 or word_count > 1000:
            return 'advanced'
        elif avg_sentence_length > 15 or word_count > 500:
            return 'intermediate'
        else:
            return 'beginner'
    
    def estimate_study_time(self, text: str) -> str:
        """Estimate study time"""
        word_count = len(text.split())
        read_time = word_count / 200
        study_time = read_time * 2
        
        if study_time < 5:
            return "5 minutes"
        elif study_time < 15:
            return f"{int(study_time)} minutes"
        elif study_time < 60:
            return f"{int(study_time)} minutes"
        else:
            hours = int(study_time / 60)
            minutes = int(study_time % 60)
            return f"{hours}h {minutes}m"

# Initialize global service
ai_service = AINotesService()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-notes",
        "timestamp": datetime.now().isoformat(),
        "device": ai_service.device,
        "models_loaded": list(ai_service.models_loaded.keys())
    }

# Service status endpoint
@app.get("/status", response_model=ServiceStatus)
async def get_status():
    try:
        # Initialize models if not already loaded
        if not ai_service.models_loaded:
            await ai_service.initialize_models()
        
        return ServiceStatus(
            status="ready",
            models_loaded=list(ai_service.models_loaded.keys()),
            capabilities=[
                "video_transcription",
                "text_analysis", 
                "question_generation",
                "concept_extraction",
                "summarization",
                "flashcard_generation"
            ]
        )
    except Exception as e:
        return ServiceStatus(
            status="error",
            models_loaded=[],
            capabilities=[]
        )

# Process video endpoint
@app.post("/process-video", response_model=AINotesResponse)
async def process_video(request: ProcessVideoRequest):
    try:
        start_time = time.time()
        
        logger.info(f"Processing video: {request.video_path}")
        
        # Initialize models if needed
        if not ai_service.models_loaded:
            await ai_service.initialize_models()
        
        # Transcribe video
        transcript_data = await ai_service.transcribe_video(request.video_path)
        
        # Analyze transcript
        analysis = await ai_service.analyze_text(
            transcript_data['text'], 
            request.title, 
            request.subject
        )
        
        # Combine results
        result = {
            'transcript': transcript_data,
            'analysis': analysis,
            'segments': transcript_data['segments'],
            'summary': analysis['summary'],
            'key_points': analysis['key_points'],
            'concepts': analysis['concepts'],
            'questions': analysis['questions'],
            'timeline': analysis['timeline'],
            'flashcards': analysis['flashcards'],
            'metadata': {
                'video_path': request.video_path,
                'title': request.title,
                'subject': request.subject,
                'processing_method': 'local_ai_microservice',
                'models_used': list(ai_service.models_loaded.keys()),
                'word_count': analysis['word_count'],
                'duration': transcript_data['duration'],
                'language': transcript_data['language']
            }
        }
        
        processing_time = time.time() - start_time
        
        return AINotesResponse(
            success=True,
            data=result,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Video processing failed: {e}")
        return AINotesResponse(
            success=False,
            error=str(e)
        )

# Process text endpoint
@app.post("/process-text", response_model=AINotesResponse)
async def process_text(request: ProcessTextRequest):
    try:
        start_time = time.time()
        
        logger.info("Processing text content")
        
        # Initialize models if needed
        if not ai_service.models_loaded:
            await ai_service.initialize_models()
        
        # Analyze text
        analysis = await ai_service.analyze_text(
            request.text, 
            request.title, 
            request.subject
        )
        
        result = {
            'transcript': {
                'text': request.text,
                'language': 'en',
                'segments': [],
                'duration': 0
            },
            'analysis': analysis,
            'summary': analysis['summary'],
            'key_points': analysis['key_points'],
            'concepts': analysis['concepts'],
            'questions': analysis['questions'],
            'timeline': analysis['timeline'],
            'flashcards': analysis['flashcards'],
            'metadata': {
                'title': request.title,
                'subject': request.subject,
                'processing_method': 'local_ai_microservice_text',
                'models_used': list(ai_service.models_loaded.keys()),
                'word_count': analysis['word_count']
            }
        }
        
        processing_time = time.time() - start_time
        
        return AINotesResponse(
            success=True,
            data=result,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Text processing failed: {e}")
        return AINotesResponse(
            success=False,
            error=str(e)
        )

# WebSocket for real-time processing updates
@app.websocket("/ws/process")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "process_video":
                # Send processing updates
                await websocket.send_text(json.dumps({
                    "type": "status",
                    "message": "Starting video processing..."
                }))
                
                # Process video and send updates
                # Implementation would go here
                
            elif message.get("type") == "process_text":
                # Handle text processing
                await websocket.send_text(json.dumps({
                    "type": "status", 
                    "message": "Processing text..."
                }))
                
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")

if __name__ == "__main__":
    # Initialize models on startup
    import asyncio
    
    async def startup():
        logger.info("Starting AI Notes Service...")
        await ai_service.initialize_models()
        logger.info("AI Notes Service ready!")
    
    # Run startup
    asyncio.run(startup())
    
    # Start the server
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8003,
        log_level="info"
    )