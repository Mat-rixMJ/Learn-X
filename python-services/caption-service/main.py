# Python Caption Generation Service
# Advanced caption formatting, timing, and multi-language synchronization

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Union
import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
import aiohttp
import re
import uvicorn

# Caption and subtitle libraries
try:
    import webvtt
    import pysrt
    from datetime import timedelta as td
    import nltk
    from nltk.tokenize import sent_tokenize, word_tokenize
    import spacy
except ImportError as e:
    print(f"Missing required library: {e}")
    print("Install with: pip install webvtt-py pysrt nltk spacy")
    exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Learn-X Caption Service",
    description="Advanced caption generation, formatting, and multi-language synchronization",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
class CaptionConfig:
    def __init__(self):
        self.audio_service_url = "http://localhost:8001"
        self.translation_service_url = "http://localhost:8002"
        self.max_caption_length = 80  # Characters per line
        self.max_lines_per_caption = 2
        self.min_duration = 1.0  # Minimum caption duration in seconds
        self.max_duration = 5.0  # Maximum caption duration in seconds
        self.word_timing_threshold = 0.1  # Minimum time between words

config = CaptionConfig()

# Pydantic models
class CaptionRequest(BaseModel):
    text: str
    start_time: float
    end_time: float
    language: str
    speaker_id: Optional[str] = None
    confidence: Optional[float] = 1.0

class MultiLanguageCaptionRequest(BaseModel):
    captions: List[CaptionRequest]
    target_languages: List[str]
    source_language: str = "en-US"

class FormattedCaption(BaseModel):
    id: str
    text: str
    start_time: float
    end_time: float
    duration: float
    language: str
    speaker_id: Optional[str] = None
    confidence: float
    word_count: int
    character_count: int
    formatting: Dict

class SubtitleFormat(BaseModel):
    format: str  # "srt", "vtt", "ass", "json"
    content: str
    language: str
    total_captions: int

# Caption processing service
class CaptionProcessor:
    def __init__(self):
        self.nlp = None
        self.load_nlp_models()
        
    def load_nlp_models(self):
        """Load NLP models for text processing"""
        try:
            # Download required NLTK data
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
            
            # Load spaCy model for advanced text processing
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                logger.warning("spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
                
        except Exception as e:
            logger.warning(f"NLP model loading failed: {e}")
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text for captions"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Fix common speech recognition errors
        text = re.sub(r'\buh\b|\bum\b|\ber\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Capitalize first letter
        if text:
            text = text[0].upper() + text[1:]
        
        return text
    
    def split_long_captions(self, text: str, max_length: int = 80) -> List[str]:
        """Split long text into appropriately sized caption lines"""
        if len(text) <= max_length:
            return [text]
        
        # Try to split at sentence boundaries first
        if self.nlp:
            doc = self.nlp(text)
            sentences = [sent.text.strip() for sent in doc.sents]
        else:
            sentences = sent_tokenize(text)
        
        lines = []
        current_line = ""
        
        for sentence in sentences:
            if len(current_line + " " + sentence) <= max_length:
                current_line = (current_line + " " + sentence).strip()
            else:
                if current_line:
                    lines.append(current_line)
                
                # If single sentence is too long, split at word boundaries
                if len(sentence) > max_length:
                    words = sentence.split()
                    word_line = ""
                    
                    for word in words:
                        if len(word_line + " " + word) <= max_length:
                            word_line = (word_line + " " + word).strip()
                        else:
                            if word_line:
                                lines.append(word_line)
                            word_line = word
                    
                    if word_line:
                        current_line = word_line
                else:
                    current_line = sentence
        
        if current_line:
            lines.append(current_line)
        
        return lines
    
    def adjust_timing(self, captions: List[CaptionRequest]) -> List[FormattedCaption]:
        """Adjust caption timing for optimal readability"""
        formatted_captions = []
        
        for i, caption in enumerate(captions):
            # Clean text
            cleaned_text = self.clean_text(caption.text)
            
            if not cleaned_text:
                continue
            
            # Split into appropriate lines
            lines = self.split_long_captions(cleaned_text, config.max_caption_length)
            
            # Calculate optimal duration based on reading speed
            # Average reading speed: 200-250 words per minute
            word_count = len(cleaned_text.split())
            min_reading_time = (word_count / 200) * 60  # seconds
            available_time = caption.end_time - caption.start_time
            
            # Adjust duration if needed
            duration = max(min_reading_time, config.min_duration)
            duration = min(duration, config.max_duration, available_time)
            
            # Create formatted caption
            formatted_caption = FormattedCaption(
                id=f"caption_{i}",
                text=cleaned_text,
                start_time=caption.start_time,
                end_time=caption.start_time + duration,
                duration=duration,
                language=caption.language,
                speaker_id=caption.speaker_id,
                confidence=caption.confidence,
                word_count=word_count,
                character_count=len(cleaned_text),
                formatting={
                    "lines": lines,
                    "line_count": len(lines),
                    "max_line_length": max(len(line) for line in lines) if lines else 0,
                    "reading_time": min_reading_time
                }
            )
            
            formatted_captions.append(formatted_caption)
        
        return formatted_captions
    
    def generate_srt(self, captions: List[FormattedCaption]) -> str:
        """Generate SRT subtitle format"""
        srt_content = []
        
        for i, caption in enumerate(captions, 1):
            start_time = self.seconds_to_srt_time(caption.start_time)
            end_time = self.seconds_to_srt_time(caption.end_time)
            
            # Format text with line breaks if needed
            text_lines = caption.formatting["lines"]
            text = "\n".join(text_lines) if len(text_lines) > 1 else caption.text
            
            srt_block = f"{i}\n{start_time} --> {end_time}\n{text}\n"
            srt_content.append(srt_block)
        
        return "\n".join(srt_content)
    
    def generate_vtt(self, captions: List[FormattedCaption]) -> str:
        """Generate WebVTT subtitle format"""
        vtt_content = ["WEBVTT", ""]
        
        for caption in captions:
            start_time = self.seconds_to_vtt_time(caption.start_time)
            end_time = self.seconds_to_vtt_time(caption.end_time)
            
            # Format text with line breaks
            text_lines = caption.formatting["lines"]
            text = "\n".join(text_lines) if len(text_lines) > 1 else caption.text
            
            vtt_block = f"{start_time} --> {end_time}\n{text}\n"
            vtt_content.append(vtt_block)
        
        return "\n".join(vtt_content)
    
    def seconds_to_srt_time(self, seconds: float) -> str:
        """Convert seconds to SRT time format"""
        td_obj = td(seconds=seconds)
        hours, remainder = divmod(td_obj.total_seconds(), 3600)
        minutes, seconds = divmod(remainder, 60)
        milliseconds = int((seconds % 1) * 1000)
        
        return f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d},{milliseconds:03d}"
    
    def seconds_to_vtt_time(self, seconds: float) -> str:
        """Convert seconds to WebVTT time format"""
        td_obj = td(seconds=seconds)
        hours, remainder = divmod(td_obj.total_seconds(), 3600)
        minutes, seconds = divmod(remainder, 60)
        milliseconds = int((seconds % 1) * 1000)
        
        return f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}.{milliseconds:03d}"

caption_processor = CaptionProcessor()

# Multi-language caption service
class MultiLanguageCaptionService:
    def __init__(self):
        self.active_sessions: Dict[str, Dict] = {}
        
    async def translate_captions(self, captions: List[FormattedCaption], 
                               target_languages: List[str]) -> Dict[str, List[FormattedCaption]]:
        """Translate captions to multiple languages"""
        translated_captions = {}
        
        for target_lang in target_languages:
            translated_list = []
            
            for caption in captions:
                # Skip if already in target language
                if caption.language == target_lang:
                    translated_list.append(caption)
                    continue
                
                # Translate text
                try:
                    async with aiohttp.ClientSession() as session:
                        payload = {
                            "text": caption.text,
                            "target_language": target_lang,
                            "source_language": caption.language
                        }
                        
                        async with session.post(
                            f"{config.translation_service_url}/translate",
                            json=payload
                        ) as response:
                            if response.status == 200:
                                result = await response.json()
                                
                                # Create translated caption
                                translated_caption = FormattedCaption(
                                    id=f"{caption.id}_{target_lang}",
                                    text=result["translated_text"],
                                    start_time=caption.start_time,
                                    end_time=caption.end_time,
                                    duration=caption.duration,
                                    language=target_lang,
                                    speaker_id=caption.speaker_id,
                                    confidence=caption.confidence * result["confidence"],
                                    word_count=len(result["translated_text"].split()),
                                    character_count=len(result["translated_text"]),
                                    formatting=caption_processor.split_long_captions(result["translated_text"])
                                )
                                
                                translated_list.append(translated_caption)
                            else:
                                # Fallback to original if translation fails
                                translated_list.append(caption)
                                
                except Exception as e:
                    logger.warning(f"Translation failed for {target_lang}: {e}")
                    translated_list.append(caption)
            
            translated_captions[target_lang] = translated_list
        
        return translated_captions

multi_lang_service = MultiLanguageCaptionService()

# API Routes

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Learn-X Caption Service",
        "status": "running",
        "audio_service": config.audio_service_url,
        "translation_service": config.translation_service_url,
        "features": [
            "caption_formatting",
            "timing_adjustment", 
            "multi_language_support",
            "srt_generation",
            "vtt_generation",
            "real_time_processing"
        ]
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    # Test connectivity to other services
    audio_service_healthy = False
    translation_service_healthy = False
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{config.audio_service_url}/health", timeout=3) as response:
                audio_service_healthy = response.status == 200
    except:
        pass
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{config.translation_service_url}/health", timeout=3) as response:
                translation_service_healthy = response.status == 200
    except:
        pass
    
    return {
        "status": "healthy",
        "services": {
            "audio_service": {
                "url": config.audio_service_url,
                "healthy": audio_service_healthy
            },
            "translation_service": {
                "url": config.translation_service_url,
                "healthy": translation_service_healthy
            }
        },
        "nlp": {
            "spacy_loaded": caption_processor.nlp is not None,
            "nltk_available": True
        },
        "active_sessions": len(multi_lang_service.active_sessions),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/process")
async def process_captions(request: List[CaptionRequest]):
    """Process and format captions"""
    if not request:
        raise HTTPException(status_code=400, detail="No captions provided")
    
    # Process captions
    formatted_captions = caption_processor.adjust_timing(request)
    
    return {
        "success": True,
        "captions": formatted_captions,
        "total_captions": len(formatted_captions),
        "total_duration": sum(cap.duration for cap in formatted_captions)
    }

@app.post("/multi-language")
async def process_multi_language_captions(request: MultiLanguageCaptionRequest):
    """Process captions for multiple languages"""
    if not request.captions:
        raise HTTPException(status_code=400, detail="No captions provided")
    
    # Format original captions
    formatted_captions = caption_processor.adjust_timing(request.captions)
    
    # Translate to target languages
    translated_captions = await multi_lang_service.translate_captions(
        formatted_captions, request.target_languages
    )
    
    return {
        "success": True,
        "source_language": request.source_language,
        "languages": list(translated_captions.keys()),
        "captions": translated_captions,
        "statistics": {
            "original_count": len(formatted_captions),
            "languages_count": len(translated_captions),
            "total_translations": sum(len(captions) for captions in translated_captions.values())
        }
    }

@app.post("/export/{format}")
async def export_captions(format: str, captions: List[FormattedCaption], language: str = "en-US"):
    """Export captions in various formats"""
    
    if format.lower() not in ["srt", "vtt", "json"]:
        raise HTTPException(status_code=400, detail="Unsupported format. Use: srt, vtt, json")
    
    if format.lower() == "srt":
        content = caption_processor.generate_srt(captions)
    elif format.lower() == "vtt":
        content = caption_processor.generate_vtt(captions)
    elif format.lower() == "json":
        content = json.dumps([caption.dict() for caption in captions], indent=2)
    
    return SubtitleFormat(
        format=format.lower(),
        content=content,
        language=language,
        total_captions=len(captions)
    )

@app.websocket("/ws/realtime/{session_id}")
async def websocket_realtime_captions(websocket: WebSocket, session_id: str):
    """WebSocket for real-time caption processing"""
    await websocket.accept()
    
    logger.info(f"Real-time caption session started: {session_id}")
    
    try:
        # Initialize session
        multi_lang_service.active_sessions[session_id] = {
            "start_time": datetime.now(),
            "captions_processed": 0,
            "languages": []
        }
        
        while True:
            # Receive caption data
            data = await websocket.receive_json()
            
            if data.get("type") == "caption":
                # Process single caption
                caption_req = CaptionRequest(**data["caption"])
                formatted_captions = caption_processor.adjust_timing([caption_req])
                
                if formatted_captions:
                    await websocket.send_json({
                        "type": "formatted_caption",
                        "caption": formatted_captions[0].dict(),
                        "session_id": session_id
                    })
                    
                    multi_lang_service.active_sessions[session_id]["captions_processed"] += 1
            
            elif data.get("type") == "translate":
                # Translate existing caption
                caption = FormattedCaption(**data["caption"])
                target_languages = data.get("target_languages", [])
                
                translated = await multi_lang_service.translate_captions(
                    [caption], target_languages
                )
                
                await websocket.send_json({
                    "type": "translated_captions",
                    "translations": translated,
                    "session_id": session_id
                })
            
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        logger.info(f"Real-time caption session disconnected: {session_id}")
        if session_id in multi_lang_service.active_sessions:
            del multi_lang_service.active_sessions[session_id]
    
    except Exception as e:
        logger.error(f"WebSocket error in session {session_id}: {e}")
        await websocket.send_json({"type": "error", "message": str(e)})

@app.get("/sessions")
async def get_active_sessions():
    """Get active caption sessions"""
    return {
        "active_sessions": len(multi_lang_service.active_sessions),
        "sessions": {
            session_id: {
                "duration": (datetime.now() - session_data["start_time"]).total_seconds(),
                "captions_processed": session_data["captions_processed"],
                "languages": session_data.get("languages", [])
            }
            for session_id, session_data in multi_lang_service.active_sessions.items()
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8003,
        log_level="info",
        reload=False
    )