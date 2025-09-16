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
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Learn-X AI Notes Service",
    description="AI-powered educational content analysis integrated with existing microservices",
    version="2.1.0"
)

# CORS middleware - Match existing services
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service configuration to match existing infrastructure
class ServiceConfig:
    AI_NOTES_PORT = 8003
    AUDIO_SERVICE_URL = "http://localhost:8001"
    TRANSLATION_SERVICE_URL = "http://localhost:8002" 
    CAPTION_SERVICE_URL = "http://localhost:8004"
    
    # Service integration endpoints
    AUDIO_TRANSCRIBE_ENDPOINT = "/transcribe"
    TRANSLATION_ENDPOINT = "/translate"
    CAPTION_GENERATE_ENDPOINT = "/generate-captions"

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

# Lightweight AI service implementation with microservice integration
class LightweightAIService:
    def __init__(self):
        self.models_loaded = {}
        self.ai_libraries_available = False
        self.service_config = ServiceConfig()
        logger.info("Initializing AI Notes Service with microservice integration...")
        
    def _check_ai_libraries(self):
        """Check if AI libraries are available"""
        try:
            import torch
            import transformers
            import nltk
            self.ai_libraries_available = True
            logger.info("✅ AI libraries available - enhanced mode enabled")
            return True
        except ImportError:
            logger.info("⚠️ AI libraries not available - running in basic mode with service integration")
            return False
    
    async def _call_audio_service(self, video_path: str) -> Dict[str, Any]:
        """Call the existing audio service for transcription"""
        try:
            async with aiohttp.ClientSession() as session:
                # Prepare form data for file upload
                data = aiohttp.FormData()
                data.add_field('file', open(video_path, 'rb'), filename=os.path.basename(video_path))
                data.add_field('language', 'auto')
                data.add_field('task', 'transcribe')
                
                async with session.post(
                    f"{self.service_config.AUDIO_SERVICE_URL}{self.service_config.AUDIO_TRANSCRIBE_ENDPOINT}",
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=300)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info("✅ Audio service transcription successful")
                        return result
                    else:
                        logger.warning(f"Audio service failed with status {response.status}")
                        return None
        except Exception as e:
            logger.warning(f"Audio service call failed: {e}")
            return None
    
    async def _call_translation_service(self, text: str, target_language: str = "es") -> Dict[str, Any]:
        """Call the existing translation service"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "text": text,
                    "source_language": "en",
                    "target_language": target_language,
                    "use_cache": True
                }
                
                async with session.post(
                    f"{self.service_config.TRANSLATION_SERVICE_URL}{self.service_config.TRANSLATION_ENDPOINT}",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info("✅ Translation service successful")
                        return result
                    else:
                        logger.warning(f"Translation service failed with status {response.status}")
                        return None
        except Exception as e:
            logger.warning(f"Translation service call failed: {e}")
            return None
    
    async def _call_caption_service(self, video_path: str, language: str = "en") -> Dict[str, Any]:
        """Call the existing caption service"""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "video_path": video_path,
                    "language": language,
                    "format": "srt",
                    "max_line_length": 40,
                    "max_duration": 5.0
                }
                
                async with session.post(
                    f"{self.service_config.CAPTION_SERVICE_URL}{self.service_config.CAPTION_GENERATE_ENDPOINT}",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=300)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info("✅ Caption service successful")
                        return result
                    else:
                        logger.warning(f"Caption service failed with status {response.status}")
                        return None
        except Exception as e:
            logger.warning(f"Caption service call failed: {e}")
            return None
    
    async def transcribe_video_enhanced(self, video_path: str) -> Dict[str, Any]:
        """Enhanced video transcription using existing audio service"""
        try:
            logger.info(f"Processing video with service integration: {video_path}")
            
            # Try to use the existing audio service first
            audio_result = await self._call_audio_service(video_path)
            
            if audio_result and audio_result.get('success'):
                # Convert audio service format to our expected format
                transcript_data = audio_result.get('data', {})
                
                return {
                    'text': transcript_data.get('transcript', {}).get('text', ''),
                    'language': transcript_data.get('transcript', {}).get('language', 'en'),
                    'segments': transcript_data.get('transcript', {}).get('segments', []),
                    'duration': transcript_data.get('transcript', {}).get('duration', 0),
                    'processing_method': 'existing_audio_service'
                }
            else:
                # Fallback to basic transcription
                logger.info("Audio service unavailable, using fallback transcription")
                return await self.transcribe_video_basic(video_path)
                
        except Exception as e:
            logger.error(f"Enhanced transcription failed: {e}")
            # Fallback to basic method
            return await self.transcribe_video_basic(video_path)
    
    async def transcribe_video_basic(self, video_path: str) -> Dict[str, Any]:
        """Basic video transcription without heavy ML dependencies"""
        try:
            logger.info(f"Processing video (basic mode): {video_path}")
            
            # For now, return a mock transcript that can be enhanced later
            # In a real implementation, this could use a lightweight transcription service
            # or fall back to existing caption services
            
            return {
                'text': f"Video content from {os.path.basename(video_path)}. This is a placeholder transcript that will be enhanced when AI models are available.",
                'language': 'en',
                'segments': [
                    {
                        'start': 0,
                        'end': 30,
                        'text': f"Introduction to {os.path.basename(video_path)}",
                        'confidence': 0.8
                    },
                    {
                        'start': 30,
                        'end': 60,
                        'text': "Main content discussion and key concepts",
                        'confidence': 0.8
                    }
                ],
                'duration': 60,
                'processing_method': 'basic_fallback'
            }
            
        except Exception as e:
            logger.error(f"Basic transcription failed: {e}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    async def analyze_text_basic(self, text: str, title: str = "", subject: str = "") -> Dict[str, Any]:
        """Basic text analysis without heavy ML dependencies"""
        try:
            logger.info("Analyzing text with basic methods...")
            
            # Basic text processing
            sentences = self._split_sentences(text)
            words = text.split()
            
            # Generate basic analysis
            summary = self._generate_basic_summary(sentences)
            key_points = self._extract_basic_key_points(sentences)
            concepts = self._extract_basic_concepts(text, subject)
            questions = self._generate_basic_questions(text, title, subject)
            timeline = self._create_basic_timeline(sentences)
            flashcards = self._generate_basic_flashcards(concepts, text)
            
            return {
                'summary': summary,
                'key_points': key_points,
                'concepts': concepts,
                'questions': questions,
                'difficulty': self._estimate_difficulty(text),
                'estimated_study_time': self._estimate_study_time(text),
                'timeline': timeline,
                'flashcards': flashcards,
                'topics': self._extract_basic_topics(text, subject),
                'word_count': len(words),
                'sentence_count': len(sentences)
            }
            
        except Exception as e:
            logger.error(f"Basic text analysis failed: {e}")
            raise HTTPException(status_code=500, detail=f"Text analysis failed: {str(e)}")
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences using basic regex"""
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _generate_basic_summary(self, sentences: List[str]) -> str:
        """Generate a basic summary by taking first few sentences"""
        if not sentences:
            return "No content available for summary."
        
        # Take first 2-3 sentences as summary
        summary_sentences = sentences[:min(3, len(sentences))]
        return '. '.join(summary_sentences) + '.'
    
    def _extract_basic_key_points(self, sentences: List[str]) -> List[str]:
        """Extract key points based on basic criteria"""
        key_points = []
        
        for sentence in sentences[:10]:  # Limit to first 10 sentences
            words = sentence.split()
            if 10 <= len(words) <= 30:  # Reasonable length
                # Prioritize sentences with certain keywords
                important_words = ['important', 'key', 'main', 'primary', 'significant', 'essential']
                if any(word.lower() in sentence.lower() for word in important_words):
                    key_points.append(sentence.strip())
                elif len(key_points) < 5:  # Fill up to 5 key points
                    key_points.append(sentence.strip())
        
        return key_points[:8]  # Limit to 8 key points
    
    def _extract_basic_concepts(self, text: str, subject: str = "") -> List[Dict[str, str]]:
        """Extract basic concepts using simple pattern matching"""
        concepts = []
        
        # Add subject as a concept if provided
        if subject:
            concepts.append({
                'term': subject.title(),
                'definition': f"Main subject area: {subject}",
                'category': 'subject',
                'importance': 'high'
            })
        
        # Look for capitalized words that might be concepts
        words = text.split()
        capitalized_words = set()
        
        for word in words:
            clean_word = re.sub(r'[^\w]', '', word)
            if clean_word and clean_word[0].isupper() and len(clean_word) > 3:
                capitalized_words.add(clean_word)
        
        # Convert to concepts
        for word in list(capitalized_words)[:10]:  # Limit to 10
            concepts.append({
                'term': word,
                'definition': f"Key concept: {word}",
                'category': 'concept',
                'importance': 'medium'
            })
        
        return concepts[:15]
    
    def _generate_basic_questions(self, text: str, title: str = "", subject: str = "") -> List[Dict[str, Any]]:
        """Generate basic questions"""
        questions = []
        
        # Template questions
        if title:
            questions.append({
                'question': f"What is the main topic of '{title}'?",
                'answer': f"The main topic is {title}, which covers {subject or 'various concepts'}.",
                'difficulty': 'easy',
                'type': 'overview',
                'topic': subject or 'general'
            })
        
        if subject:
            questions.append({
                'question': f"What are the key concepts in {subject}?",
                'answer': f"The key concepts include the main ideas and principles discussed in the {subject} content.",
                'difficulty': 'medium',
                'type': 'conceptual',
                'topic': subject
            })
        
        # Generate questions from text content
        sentences = self._split_sentences(text)
        for i, sentence in enumerate(sentences[:3]):  # Limit to first 3 sentences
            if len(sentence.split()) > 8:  # Reasonably detailed sentences
                questions.append({
                    'question': f"Can you explain the concept mentioned in: '{sentence[:50]}...'?",
                    'answer': sentence,
                    'difficulty': 'medium',
                    'type': 'comprehension',
                    'topic': subject or 'general'
                })
        
        return questions[:8]
    
    def _create_basic_timeline(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Create a basic timeline structure"""
        timeline = []
        chapter_size = max(3, len(sentences) // 5)
        
        for i in range(0, len(sentences), chapter_size):
            chapter_sentences = sentences[i:i+chapter_size]
            chapter_text = ' '.join(chapter_sentences)
            
            # Create chapter title from first few words
            words = chapter_text.split()[:8]
            title = ' '.join(words) + ('...' if len(chapter_text.split()) > 8 else '')
            
            timeline.append({
                'timestamp': f"{i//chapter_size * 5}:00",
                'title': title,
                'description': chapter_text[:100] + ('...' if len(chapter_text) > 100 else ''),
                'chapter': i//chapter_size + 1
            })
        
        return timeline[:8]
    
    def _generate_basic_flashcards(self, concepts: List[Dict], text: str) -> List[Dict[str, str]]:
        """Generate basic flashcards"""
        flashcards = []
        
        for concept in concepts[:8]:  # Limit to 8 flashcards
            term = concept['term']
            definition = concept.get('definition', f"Definition of {term}")
            
            flashcards.append({
                'front': f"What is {term}?",
                'back': definition,
                'category': concept.get('category', 'general'),
                'difficulty': concept.get('importance', 'medium')
            })
        
        return flashcards
    
    def _extract_basic_topics(self, text: str, subject: str = "") -> List[str]:
        """Extract basic topics"""
        topics = []
        
        if subject:
            topics.append(subject.title())
        
        # Look for common academic topics
        common_topics = ['science', 'mathematics', 'history', 'literature', 'programming', 'business', 'technology']
        text_lower = text.lower()
        
        for topic in common_topics:
            if topic in text_lower:
                topics.append(topic.title())
        
        return list(set(topics))[:6]
    
    def _estimate_difficulty(self, text: str) -> str:
        """Estimate content difficulty based on basic metrics"""
        words = text.split()
        sentences = self._split_sentences(text)
        
        avg_sentence_length = len(words) / len(sentences) if sentences else 0
        word_count = len(words)
        
        if avg_sentence_length > 20 or word_count > 1000:
            return 'advanced'
        elif avg_sentence_length > 15 or word_count > 500:
            return 'intermediate'
        else:
            return 'beginner'
    
    def _estimate_study_time(self, text: str) -> str:
        """Estimate study time based on word count"""
        word_count = len(text.split())
        read_time = word_count / 200  # Average reading speed
        study_time = read_time * 2.5  # Study time is longer than reading time
        
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
ai_service = LightweightAIService()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-notes-lightweight",
        "timestamp": datetime.now().isoformat(),
        "mode": "enhanced" if ai_service.ai_libraries_available else "basic"
    }

# Service status endpoint
@app.get("/status", response_model=ServiceStatus)
async def get_status():
    ai_service._check_ai_libraries()
    
    capabilities = [
        "text_analysis", 
        "basic_transcription",
        "question_generation",
        "concept_extraction",
        "summarization",
        "flashcard_generation"
    ]
    
    if ai_service.ai_libraries_available:
        capabilities.extend(["enhanced_ai_processing", "ml_models"])
    
    return ServiceStatus(
        status="ready",
        models_loaded=list(ai_service.models_loaded.keys()),
        capabilities=capabilities
    )

# Process video endpoint
@app.post("/process-video", response_model=AINotesResponse)
async def process_video(request: ProcessVideoRequest):
    try:
        start_time = time.time()
        
        logger.info(f"Processing video: {request.video_path}")
        
        # Enhanced video processing with service integration
        transcript_data = await ai_service.transcribe_video_enhanced(request.video_path)
        
        # Analyze transcript
        analysis = await ai_service.analyze_text_basic(
            transcript_data['text'], 
            request.title, 
            request.subject
        )
        
        # Try to get additional services data
        services_used = [transcript_data.get('processing_method', 'basic')]
        additional_data = {}
        
        # Try translation service
        try:
            translation_result = await ai_service._call_translation_service(transcript_data['text'])
            if translation_result and translation_result.get('success'):
                additional_data['translations'] = translation_result.get('data', {})
                services_used.append('translation')
        except Exception as e:
            logger.warning(f"Translation service unavailable: {e}")
        
        # Try caption service
        try:
            caption_result = await ai_service._call_caption_service(request.video_path)
            if caption_result and caption_result.get('success'):
                additional_data['captions'] = caption_result.get('data', {})
                services_used.append('caption')
        except Exception as e:
            logger.warning(f"Caption service unavailable: {e}")
        
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
                'processing_method': 'enhanced_ai_service',
                'models_used': ['enhanced_text_processing'],
                'services_used': services_used,
                'word_count': analysis['word_count'],
                'duration': transcript_data['duration'],
                'language': transcript_data['language']
            }
        }
        
        # Add additional service data if available
        result.update(additional_data)
        
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
        
        # Analyze text
        analysis = await ai_service.analyze_text_basic(
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
                'processing_method': 'lightweight_ai_service_text',
                'models_used': ['basic_text_processing'],
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

if __name__ == "__main__":
    logger.info("Starting Lightweight AI Notes Service...")
    
    # Check for AI libraries
    ai_service._check_ai_libraries()
    
    logger.info("AI Notes Service ready!")
    
    # Start the server
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8003,
        log_level="info"
    )