#!/usr/bin/env python3
"""
Local AI Service for Learn-X Platform
Replaces Gemini AI with local open-source models

Features:
- Video/Audio transcription using OpenAI Whisper
- Text analysis and summarization using Hugging Face transformers
- Question generation using local language models
- Key concept extraction and analysis
- No external API dependencies
"""

import sys
import os
import json
import logging
import argparse
from pathlib import Path
import subprocess
import tempfile
import re
from typing import Dict, List, Any, Optional, Tuple

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# AI/ML Libraries
try:
    import whisper
    import torch
    import transformers
    from transformers import (
        AutoTokenizer, AutoModelForSeq2SeqLM,
        pipeline, BartTokenizer, BartForConditionalGeneration
    )
    from sentence_transformers import SentenceTransformer
    import nltk
    from nltk.tokenize import sent_tokenize, word_tokenize
    from nltk.corpus import stopwords
    from nltk.stem import WordNetLemmatizer
    import spacy
except ImportError as e:
    print(f"Missing required AI libraries: {e}")
    print("Please install: pip install whisper torch transformers sentence-transformers nltk spacy")
    sys.exit(1)

# Download required NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('wordnet', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
except:
    pass

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LocalAIService:
    """Local AI service for video analysis and note generation"""
    
    def __init__(self):
        """Initialize all AI models"""
        logger.info("🤖 Initializing Local AI Service...")
        
        # Device selection (GPU if available)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
        # Initialize models lazily to save memory
        self._whisper_model = None
        self._summarizer = None
        self._question_generator = None
        self._sentence_model = None
        self._nlp = None
        self._lemmatizer = None
        
        logger.info("✅ Local AI Service initialized")
    
    @property
    def whisper_model(self):
        """Lazy load Whisper model"""
        if self._whisper_model is None:
            logger.info("Loading Whisper model...")
            self._whisper_model = whisper.load_model("base")
        return self._whisper_model
    
    @property
    def summarizer(self):
        """Lazy load summarization model"""
        if self._summarizer is None:
            logger.info("Loading summarization model...")
            try:
                # Try smaller distilbert-based summarization model first
                self._summarizer = pipeline(
                    "summarization",
                    model="sshleifer/distilbart-cnn-12-6",
                    device=0 if self.device == "cuda" else -1
                )
            except Exception as e:
                logger.warning(f"Failed to load distilbart model: {e}")
                try:
                    # Fallback to facebook/bart-large-cnn but with memory optimization
                    self._summarizer = pipeline(
                        "summarization",
                        model="facebook/bart-large-cnn",
                        device=0 if self.device == "cuda" else -1,
                        torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
                    )
                except Exception as e2:
                    logger.error(f"Failed to load any summarization model: {e2}")
                    self._summarizer = None
        return self._summarizer
    
    @property
    def question_generator(self):
        """Lazy load question generation model"""
        if self._question_generator is None:
            logger.info("Loading question generation model...")
            # Use a lighter model for question generation
            self._question_generator = pipeline(
                "text2text-generation",
                model="valhalla/t5-small-qg-hl",
                device=0 if self.device == "cuda" else -1
            )
        return self._question_generator
    
    @property
    def sentence_model(self):
        """Lazy load sentence transformer"""
        if self._sentence_model is None:
            logger.info("Loading sentence transformer...")
            self._sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        return self._sentence_model
    
    @property
    def nlp(self):
        """Lazy load spaCy model"""
        if self._nlp is None:
            logger.info("Loading spaCy model...")
            try:
                self._nlp = spacy.load("en_core_web_sm")
            except OSError:
                logger.warning("spaCy model not found, downloading...")
                subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
                self._nlp = spacy.load("en_core_web_sm")
        return self._nlp
    
    @property
    def lemmatizer(self):
        """Lazy load NLTK lemmatizer"""
        if self._lemmatizer is None:
            self._lemmatizer = WordNetLemmatizer()
        return self._lemmatizer
    
    def extract_audio_from_video(self, video_path: str) -> str:
        """Extract audio from video file using ffmpeg"""
        try:
            logger.info(f"Extracting audio from: {video_path}")
            
            # Create temporary audio file
            audio_path = video_path.rsplit('.', 1)[0] + '_audio.wav'
            
            # Use ffmpeg to extract audio
            cmd = [
                'ffmpeg', '-i', video_path,
                '-ac', '1',  # Mono channel
                '-ar', '16000',  # 16kHz sample rate
                '-y',  # Overwrite output file
                audio_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"ffmpeg error: {result.stderr}")
            
            logger.info(f"Audio extracted to: {audio_path}")
            return audio_path
            
        except Exception as e:
            logger.error(f"Failed to extract audio: {e}")
            raise
    
    def transcribe_audio(self, audio_path: str) -> Dict[str, Any]:
        """Transcribe audio using Whisper"""
        try:
            logger.info(f"Transcribing audio: {audio_path}")
            
            # Transcribe with Whisper
            result = self.whisper_model.transcribe(
                audio_path,
                language="en",
                task="transcribe",
                verbose=False
            )
            
            # Extract segments with timestamps
            segments = []
            for segment in result.get('segments', []):
                segments.append({
                    'start': segment['start'],
                    'end': segment['end'],
                    'text': segment['text'].strip(),
                    'confidence': segment.get('no_speech_prob', 0.0)
                })
            
            transcript_data = {
                'text': result['text'].strip(),
                'language': result.get('language', 'en'),
                'segments': segments,
                'duration': segments[-1]['end'] if segments else 0
            }
            
            logger.info(f"Transcription completed: {len(transcript_data['text'])} characters")
            return transcript_data
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise
    
    def analyze_text(self, text: str, title: str = "", subject: str = "") -> Dict[str, Any]:
        """Comprehensive text analysis using multiple NLP models"""
        try:
            logger.info("Analyzing text with local models...")
            
            # Clean and prepare text
            clean_text = self.clean_text(text)
            sentences = sent_tokenize(clean_text)
            
            # Generate summary
            summary = self.generate_summary(clean_text)
            
            # Extract key concepts
            key_concepts = self.extract_key_concepts(clean_text)
            
            # Generate questions
            questions = self.generate_questions(clean_text, title, subject)
            
            # Extract key points
            key_points = self.extract_key_points(sentences)
            
            # Determine difficulty and study time
            difficulty = self.estimate_difficulty(clean_text)
            study_time = self.estimate_study_time(clean_text)
            
            # Create timeline/chapters
            timeline = self.create_timeline(sentences)
            
            # Generate flashcards
            flashcards = self.generate_flashcards(key_concepts, clean_text)
            
            analysis_result = {
                'summary': summary,
                'key_points': key_points,
                'concepts': key_concepts,
                'questions': questions,
                'difficulty': difficulty,
                'estimated_study_time': study_time,
                'timeline': timeline,
                'flashcards': flashcards,
                'word_count': len(clean_text.split()),
                'sentence_count': len(sentences),
                'topics': self.extract_topics(clean_text, subject)
            }
            
            logger.info("✅ Text analysis completed")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Text analysis failed: {e}")
            raise
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep punctuation
        text = re.sub(r'[^\w\s.,!?;:()-]', '', text)
        return text.strip()
    
    def generate_summary(self, text: str) -> str:
        """Generate text summary using BART"""
        try:
            if not self.summarizer:
                logger.warning("Summarizer not available, creating basic summary")
                # Fallback: simple extractive summary (first few sentences)
                sentences = sent_tokenize(text)
                return '. '.join(sentences[:3]) + '.' if sentences else text[:200] + '...'
            
            # Split long text into chunks
            max_chunk_length = 1024
            chunks = [text[i:i+max_chunk_length] for i in range(0, len(text), max_chunk_length)]
            
            summaries = []
            for chunk in chunks:
                if len(chunk.strip()) < 50:  # Skip very short chunks
                    continue
                    
                try:
                    summary = self.summarizer(
                        chunk,
                        max_length=150,
                        min_length=30,
                        do_sample=False
                    )
                    summaries.append(summary[0]['summary_text'])
                except Exception as e:
                    logger.warning(f"Chunk summarization failed: {e}")
                    # Fallback to first sentence of chunk
                    chunk_sentences = sent_tokenize(chunk)
                    if chunk_sentences:
                        summaries.append(chunk_sentences[0])
            
            if not summaries:
                # Final fallback
                sentences = sent_tokenize(text)
                return '. '.join(sentences[:3]) + '.' if sentences else text[:200] + '...'
            
            # Combine summaries
            combined_summary = ' '.join(summaries)
            
            # Final summary if multiple chunks
            if len(summaries) > 1:
                try:
                    final_summary = self.summarizer(
                        combined_summary,
                        max_length=200,
                        min_length=50,
                        do_sample=False
                    )
                    return final_summary[0]['summary_text']
                except Exception as e:
                    logger.warning(f"Final summarization failed: {e}")
                    return combined_summary
            
            return combined_summary
            
        except Exception as e:
            logger.warning(f"Summary generation failed: {e}")
            # Fallback to extractive summary
            sentences = sent_tokenize(text)
            return '. '.join(sentences[:3]) + '.'
    
    def extract_key_concepts(self, text: str) -> List[Dict[str, str]]:
        """Extract key concepts using NLP"""
        try:
            doc = self.nlp(text)
            
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
            
            # Extract noun phrases as concepts
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
            
            return concepts[:15]  # Limit to top 15 concepts
            
        except Exception as e:
            logger.warning(f"Concept extraction failed: {e}")
            return []
    
    def generate_questions(self, text: str, title: str = "", subject: str = "") -> List[Dict[str, Any]]:
        """Generate questions from text"""
        try:
            questions = []
            sentences = sent_tokenize(text)
            
            # Select important sentences for question generation
            important_sentences = sentences[:10]  # First 10 sentences
            
            for i, sentence in enumerate(important_sentences):
                if len(sentence.strip()) < 20:
                    continue
                
                try:
                    # Generate question using T5 model
                    question_input = f"generate question: {sentence}"
                    result = self.question_generator(
                        question_input,
                        max_length=64,
                        num_return_sequences=1,
                        temperature=0.7
                    )
                    
                    question_text = result[0]['generated_text']
                    
                    # Clean up question
                    question_text = question_text.replace('question:', '').strip()
                    if not question_text.endswith('?'):
                        question_text += '?'
                    
                    # Create answer from the sentence
                    answer = sentence.strip()
                    
                    questions.append({
                        'question': question_text,
                        'answer': answer,
                        'difficulty': 'medium',
                        'type': 'conceptual',
                        'topic': subject or 'general'
                    })
                    
                except Exception as e:
                    logger.warning(f"Question generation failed for sentence {i}: {e}")
                    continue
            
            # Add some manual question templates
            manual_questions = [
                {
                    'question': f"What are the main topics covered in {title or 'this content'}?",
                    'answer': f"The main topics include the key concepts and ideas presented throughout {title or 'the content'}.",
                    'difficulty': 'easy',
                    'type': 'overview',
                    'topic': subject or 'general'
                },
                {
                    'question': f"How does this relate to {subject or 'the subject area'}?",
                    'answer': f"This content provides important insights and knowledge relevant to {subject or 'the field of study'}.",
                    'difficulty': 'medium',
                    'type': 'analytical',
                    'topic': subject or 'general'
                }
            ]
            
            questions.extend(manual_questions)
            return questions[:10]  # Limit to 10 questions
            
        except Exception as e:
            logger.warning(f"Question generation failed: {e}")
            return []
    
    def extract_key_points(self, sentences: List[str]) -> List[str]:
        """Extract key points from sentences"""
        try:
            # Score sentences based on length, position, and keywords
            scored_sentences = []
            
            for i, sentence in enumerate(sentences):
                score = 0
                words = sentence.lower().split()
                
                # Position score (beginning and end are important)
                if i < len(sentences) * 0.2:  # First 20%
                    score += 2
                elif i > len(sentences) * 0.8:  # Last 20%
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
            key_points = [sentence for score, sentence in scored_sentences[:8]]
            
            return key_points
            
        except Exception as e:
            logger.warning(f"Key point extraction failed: {e}")
            return sentences[:5]  # Fallback to first 5 sentences
    
    def estimate_difficulty(self, text: str) -> str:
        """Estimate content difficulty"""
        words = text.split()
        sentences = sent_tokenize(text)
        
        # Calculate metrics
        avg_sentence_length = len(words) / len(sentences) if sentences else 0
        word_count = len(words)
        
        # Simple difficulty estimation
        if avg_sentence_length > 20 or word_count > 1000:
            return 'advanced'
        elif avg_sentence_length > 15 or word_count > 500:
            return 'intermediate'
        else:
            return 'beginner'
    
    def estimate_study_time(self, text: str) -> str:
        """Estimate study time based on word count"""
        word_count = len(text.split())
        
        # Assuming 200 words per minute reading speed
        read_time = word_count / 200
        # Add extra time for comprehension and note-taking
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
    
    def create_timeline(self, sentences: List[str]) -> List[Dict[str, Any]]:
        """Create a timeline/chapter structure"""
        timeline = []
        
        # Group sentences into chapters (every 5-10 sentences)
        chapter_size = max(5, len(sentences) // 6)  # Aim for ~6 chapters
        
        for i in range(0, len(sentences), chapter_size):
            chapter_sentences = sentences[i:i+chapter_size]
            chapter_text = ' '.join(chapter_sentences)
            
            # Generate chapter title
            words = chapter_text.split()[:10]  # First 10 words
            title = ' '.join(words) + ('...' if len(chapter_text.split()) > 10 else '')
            
            timeline.append({
                'timestamp': f"{i//chapter_size * 2}:00",  # Rough 2-minute intervals
                'title': title,
                'description': chapter_text[:100] + ('...' if len(chapter_text) > 100 else ''),
                'chapter': i//chapter_size + 1
            })
        
        return timeline
    
    def generate_flashcards(self, concepts: List[Dict], text: str) -> List[Dict[str, str]]:
        """Generate flashcards from concepts"""
        flashcards = []
        
        for concept in concepts[:10]:  # Limit to 10 flashcards
            term = concept['term']
            definition = concept.get('definition', '')
            
            # Try to find a better definition in the text
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
    
    def extract_topics(self, text: str, subject: str = "") -> List[str]:
        """Extract main topics from text"""
        try:
            doc = self.nlp(text)
            
            # Extract noun phrases and entities as topics
            topics = set()
            
            # Add subject as primary topic
            if subject:
                topics.add(subject.title())
            
            # Extract from named entities
            for ent in doc.ents:
                if ent.label_ in ['ORG', 'EVENT', 'PRODUCT', 'WORK_OF_ART']:
                    topics.add(ent.text.title())
            
            # Extract from noun chunks
            for chunk in doc.noun_chunks:
                if len(chunk.text.split()) <= 3 and len(chunk.text) > 3:
                    topics.add(chunk.text.title())
            
            return list(topics)[:8]  # Limit to 8 topics
            
        except Exception as e:
            logger.warning(f"Topic extraction failed: {e}")
            return [subject.title()] if subject else ["General"]
    
    def process_video_file(self, video_path: str, title: str = "", subject: str = "") -> Dict[str, Any]:
        """Main method to process video file and generate comprehensive analysis"""
        try:
            logger.info(f"🎥 Processing video file: {video_path}")
            
            # Step 1: Extract audio from video
            audio_path = self.extract_audio_from_video(video_path)
            
            try:
                # Step 2: Transcribe audio
                transcript_data = self.transcribe_audio(audio_path)
                
                # Step 3: Analyze transcribed text
                analysis = self.analyze_text(transcript_data['text'], title, subject)
                
                # Step 4: Combine results
                result = {
                    'transcript': transcript_data,
                    'analysis': analysis,
                    'metadata': {
                        'video_path': video_path,
                        'title': title,
                        'subject': subject,
                        'processing_method': 'local_ai',
                        'models_used': ['whisper', 'bart', 't5', 'spacy']
                    }
                }
                
                logger.info("✅ Video processing completed successfully")
                return result
                
            finally:
                # Clean up temporary audio file
                if os.path.exists(audio_path):
                    os.remove(audio_path)
                    logger.info(f"Cleaned up temporary audio file: {audio_path}")
            
        except Exception as e:
            logger.error(f"❌ Video processing failed: {e}")
            raise
    
    def process_text_content(self, text: str, title: str = "", subject: str = "") -> Dict[str, Any]:
        """Process text content directly"""
        try:
            logger.info("📝 Processing text content...")
            
            analysis = self.analyze_text(text, title, subject)
            
            result = {
                'transcript': {
                    'text': text,
                    'language': 'en',
                    'segments': [],
                    'duration': 0
                },
                'analysis': analysis,
                'metadata': {
                    'title': title,
                    'subject': subject,
                    'processing_method': 'local_ai_text',
                    'models_used': ['bart', 't5', 'spacy']
                }
            }
            
            logger.info("✅ Text processing completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"❌ Text processing failed: {e}")
            raise

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description="Local AI Service for Learn-X")
    parser.add_argument('--input', required=True, help='Input video file or text')
    parser.add_argument('--title', default='', help='Content title')
    parser.add_argument('--subject', default='', help='Subject/topic')
    parser.add_argument('--output', help='Output JSON file path')
    parser.add_argument('--text-mode', action='store_true', help='Process as text instead of video')
    
    args = parser.parse_args()
    
    try:
        # Initialize service
        ai_service = LocalAIService()
        
        # Process content
        if args.text_mode:
            with open(args.input, 'r', encoding='utf-8') as f:
                text_content = f.read()
            result = ai_service.process_text_content(text_content, args.title, args.subject)
        else:
            result = ai_service.process_video_file(args.input, args.title, args.subject)
        
        # Save or print result
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"Results saved to: {args.output}")
        else:
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()