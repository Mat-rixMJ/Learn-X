# Python Audio Processing Service for Multi-Language Captions
# Using OpenAI Whisper for state-of-the-art speech recognition

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import logging
import tempfile
import os
from datetime import datetime
from typing import Dict, List, Optional
import uvicorn

# Audio processing libraries
try:
    import whisper
    import faster_whisper
    import librosa
    import numpy as np
    import torch
    import soundfile as sf
    from scipy import signal
    import noisereduce as nr
except ImportError as e:
    print(f"Missing required library: {e}")
    print("Install with: pip install openai-whisper faster-whisper librosa torch soundfile scipy noisereduce")
    exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Learn-X Audio Processing Service",
    description="Advanced speech recognition and audio processing for multi-language captions",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global models and configuration
class AudioConfig:
    def __init__(self):
        # Allow dynamic model size via env var to speed cold starts on low-resource machines.
        # Common sizes: tiny, base, small, medium, large, large-v2, large-v3
        requested = os.getenv("WHISPER_MODEL_SIZE", "base").strip()
        self.whisper_model_size = requested
        self.sample_rate = 16000  # Whisper's preferred sample rate
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.language_codes = {
            'en-US': 'en', 'hi-IN': 'hi', 'ta-IN': 'ta', 'te-IN': 'te',
            'kn-IN': 'kn', 'ml-IN': 'ml', 'bn-IN': 'bn', 'gu-IN': 'gu',
            'mr-IN': 'mr', 'pa-IN': 'pa', 'es-ES': 'es', 'fr-FR': 'fr',
            'de-DE': 'de', 'it-IT': 'it', 'pt-BR': 'pt', 'ja-JP': 'ja',
            'ko-KR': 'ko', 'zh-CN': 'zh', 'ar-SA': 'ar', 'ru-RU': 'ru'
        }

config = AudioConfig()

# Model management
class ModelManager:
    def __init__(self):
        self.whisper_model = None
        self.faster_whisper_model = None
        self.model_loaded = False
        self.selected_size = None
        self.fallback_chain = [
            config.whisper_model_size,  # user requested first
            "small",
            "base",
            "tiny"
        ]
        # Ensure chain has unique order preserving
        seen = set()
        self.fallback_chain = [m for m in self.fallback_chain if not (m in seen or seen.add(m))]
        self.load_errors = []

    async def load_models(self):
        """Load Whisper models with graceful fallback if OOM or missing."""
        if self.model_loaded:
            return

        last_exception = None
        for size in self.fallback_chain:
            try:
                logger.info(f"Attempting to load Whisper model '{size}' on {config.device}")
                self.faster_whisper_model = faster_whisper.WhisperModel(
                    size,
                    device=config.device,
                    compute_type="float16" if config.device == "cuda" else "int8"
                )
                self.whisper_model = whisper.load_model(size, device=config.device)
                self.model_loaded = True
                self.selected_size = size
                logger.info(f"✅ Loaded Whisper model '{size}' successfully")
                break
            except Exception as e:
                err_msg = f"Failed to load model '{size}': {e}"
                self.load_errors.append(err_msg)
                logger.warning(err_msg)
                last_exception = e
                # Small delay before next attempt to release memory
                await asyncio.sleep(0.5)

        if not self.model_loaded:
            logger.error("❌ All model load attempts failed")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {last_exception}")
    
    def get_model(self, use_faster: bool = True):
        """Get the appropriate model for transcription"""
        if not self.model_loaded:
            raise HTTPException(status_code=503, detail="Models not loaded yet")
        
        return self.faster_whisper_model if use_faster else self.whisper_model

model_manager = ModelManager()

# Audio preprocessing utilities
class AudioProcessor:
    @staticmethod
    def preprocess_audio(audio_data: np.ndarray, sample_rate: int) -> np.ndarray:
        """Advanced audio preprocessing for better recognition"""
        try:
            # Resample to 16kHz if needed
            if sample_rate != config.sample_rate:
                audio_data = librosa.resample(audio_data, orig_sr=sample_rate, target_sr=config.sample_rate)
            
            # Normalize audio
            audio_data = librosa.util.normalize(audio_data)
            
            # Noise reduction
            if len(audio_data) > config.sample_rate:  # Only for audio longer than 1 second
                audio_data = nr.reduce_noise(y=audio_data, sr=config.sample_rate, stationary=False)
            
            # High-pass filter to remove low-frequency noise
            sos = signal.butter(10, 80, btype='high', fs=config.sample_rate, output='sos')
            audio_data = signal.sosfilt(sos, audio_data)
            
            # Apply gentle compression
            audio_data = np.tanh(audio_data * 2) / 2
            
            return audio_data.astype(np.float32)
            
        except Exception as e:
            logger.warning(f"Audio preprocessing failed: {e}, using original audio")
            return audio_data.astype(np.float32)
    
    @staticmethod
    def detect_voice_activity(audio_data: np.ndarray, sample_rate: int, 
                            top_db: int = 20) -> List[tuple]:
        """Detect voice activity intervals"""
        try:
            # Split audio into non-silent intervals
            intervals = librosa.effects.split(audio_data, top_db=top_db)
            
            # Convert frame indices to time
            time_intervals = []
            for start_frame, end_frame in intervals:
                start_time = start_frame / sample_rate
                end_time = end_frame / sample_rate
                time_intervals.append((start_time, end_time))
            
            return time_intervals
            
        except Exception as e:
            logger.warning(f"Voice activity detection failed: {e}")
            return [(0.0, len(audio_data) / sample_rate)]

audio_processor = AudioProcessor()

# Speech recognition service
class SpeechRecognitionService:
    def __init__(self):
        self.active_sessions: Dict[str, Dict] = {}
    
    async def transcribe_audio(self, audio_file_path: str, language: Optional[str] = None,
                             word_timestamps: bool = True) -> Dict:
        """Transcribe audio file with advanced options"""
        try:
            model = model_manager.get_model(use_faster=True)
            
            # Map language code
            whisper_lang = None
            if language and language in config.language_codes:
                whisper_lang = config.language_codes[language]
            
            # Transcribe with faster-whisper
            segments, info = model.transcribe(
                audio_file_path,
                language=whisper_lang,
                word_timestamps=word_timestamps,
                vad_filter=True,  # Voice activity detection
                vad_parameters=dict(min_silence_duration_ms=500),
                beam_size=5,  # Better accuracy
                best_of=5,    # Multiple candidates
                temperature=0.0  # Deterministic output
            )
            
            # Convert segments to list for JSON serialization
            segment_list = []
            for segment in segments:
                segment_dict = {
                    "id": segment.id,
                    "seek": segment.seek,
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip(),
                    "tokens": segment.tokens,
                    "temperature": segment.temperature,
                    "avg_logprob": segment.avg_logprob,
                    "compression_ratio": segment.compression_ratio,
                    "no_speech_prob": segment.no_speech_prob,
                    "confidence": 1.0 - segment.no_speech_prob  # Confidence score
                }
                
                # Add word-level timestamps if available
                if hasattr(segment, 'words') and segment.words:
                    segment_dict["words"] = [
                        {
                            "start": word.start,
                            "end": word.end,
                            "word": word.word,
                            "probability": word.probability
                        }
                        for word in segment.words
                    ]
                
                segment_list.append(segment_dict)
            
            return {
                "success": True,
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration,
                "duration_after_vad": info.duration_after_vad,
                "segments": segment_list,
                "full_text": " ".join([seg["text"] for seg in segment_list]),
                "processing_time": 0  # Will be calculated by caller
            }
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "segments": [],
                "full_text": ""
            }
    
    async def process_real_time_audio(self, audio_data: bytes, session_id: str,
                                    language: Optional[str] = None) -> Dict:
        """Process real-time audio stream"""
        try:
            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                # Load and preprocess audio
                audio, sr = librosa.load(temp_file_path, sr=config.sample_rate)
                
                # Skip if audio is too short
                if len(audio) < 0.5 * config.sample_rate:  # Less than 0.5 seconds
                    return {"success": False, "error": "Audio too short", "text": ""}
                
                # Preprocess audio
                audio = audio_processor.preprocess_audio(audio, sr)
                
                # Save preprocessed audio
                sf.write(temp_file_path, audio, config.sample_rate)
                
                # Transcribe
                start_time = datetime.now()
                result = await self.transcribe_audio(temp_file_path, language, word_timestamps=True)
                end_time = datetime.now()
                
                # Calculate processing time
                processing_time = (end_time - start_time).total_seconds() * 1000  # ms
                result["processing_time"] = processing_time
                
                # Update session info
                if session_id not in self.active_sessions:
                    self.active_sessions[session_id] = {
                        "start_time": start_time,
                        "total_segments": 0,
                        "total_duration": 0
                    }
                
                session = self.active_sessions[session_id]
                session["total_segments"] += len(result.get("segments", []))
                session["total_duration"] += result.get("duration", 0)
                
                return result
                
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"Real-time audio processing failed: {e}")
            return {"success": False, "error": str(e), "text": ""}

speech_service = SpeechRecognitionService()

# API Routes

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    await model_manager.load_models()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Learn-X Audio Processing Service",
        "status": "running",
        "models_loaded": model_manager.model_loaded,
        "device": config.device,
        "requested_model": config.whisper_model_size,
        "active_model": model_manager.selected_size,
        "fallback_attempts": model_manager.load_errors,
        "supported_languages": list(config.language_codes.keys())
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy" if model_manager.model_loaded else "loading",
        "models": {
            "requested": config.whisper_model_size,
            "active": model_manager.selected_size,
            "whisper_loaded": model_manager.whisper_model is not None,
            "faster_whisper_loaded": model_manager.faster_whisper_model is not None,
            "device": config.device,
            "load_errors": model_manager.load_errors
        },
        "system": {
            "cuda_available": torch.cuda.is_available(),
            "gpu_memory": torch.cuda.get_device_properties(0).total_memory if torch.cuda.is_available() else None
        },
        "active_sessions": len(speech_service.active_sessions),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/transcribe")
async def transcribe_file(
    file: UploadFile = File(...),
    language: Optional[str] = None,
    word_timestamps: bool = True
):
    """Transcribe uploaded audio file"""
    
    if not model_manager.model_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded yet")
    
    # Validate file type
    if not file.filename.lower().endswith(('.wav', '.mp3', '.m4a', '.ogg', '.flac')):
        raise HTTPException(status_code=400, detail="Unsupported audio format")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(suffix=f".{file.filename.split('.')[-1]}", delete=False) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
    
    try:
        start_time = datetime.now()
        result = await speech_service.transcribe_audio(temp_file_path, language, word_timestamps)
        end_time = datetime.now()
        
        processing_time = (end_time - start_time).total_seconds() * 1000
        result["processing_time"] = processing_time
        
        return result
        
    finally:
        # Clean up
        try:
            os.unlink(temp_file_path)
        except:
            pass

@app.websocket("/ws/audio/{session_id}")
async def websocket_audio_stream(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time audio processing"""
    await websocket.accept()
    
    if not model_manager.model_loaded:
        await websocket.send_json({"error": "Models not loaded yet"})
        await websocket.close()
        return
    
    logger.info(f"New audio session started: {session_id}")
    
    try:
        while True:
            # Receive audio data
            message = await websocket.receive()
            
            if message["type"] == "websocket.receive":
                if "bytes" in message:
                    # Process binary audio data
                    audio_data = message["bytes"]
                    
                    # Get language from query params if provided
                    language = None
                    
                    # Process audio
                    result = await speech_service.process_real_time_audio(
                        audio_data, session_id, language
                    )
                    
                    # Send result back
                    await websocket.send_json(result)
                    
                elif "text" in message:
                    # Handle text messages (control commands)
                    try:
                        command = json.loads(message["text"])
                        
                        if command.get("type") == "config":
                            # Update session configuration
                            logger.info(f"Session {session_id} config: {command}")
                            await websocket.send_json({"status": "config_updated"})
                            
                        elif command.get("type") == "ping":
                            # Ping/pong for connection health
                            await websocket.send_json({"type": "pong"})
                            
                    except json.JSONDecodeError:
                        await websocket.send_json({"error": "Invalid JSON command"})
                        
    except WebSocketDisconnect:
        logger.info(f"Audio session disconnected: {session_id}")
        # Clean up session
        if session_id in speech_service.active_sessions:
            del speech_service.active_sessions[session_id]
        
    except Exception as e:
        logger.error(f"WebSocket error in session {session_id}: {e}")
        await websocket.send_json({"error": str(e)})

@app.get("/sessions")
async def get_active_sessions():
    """Get information about active sessions"""
    return {
        "active_sessions": len(speech_service.active_sessions),
        "sessions": {
            session_id: {
                "duration": (datetime.now() - session_data["start_time"]).total_seconds(),
                "segments": session_data["total_segments"],
                "total_audio_duration": session_data["total_duration"]
            }
            for session_id, session_data in speech_service.active_sessions.items()
        }
    }

@app.get("/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {
        "languages": config.language_codes,
        "total_count": len(config.language_codes)
    }

if __name__ == "__main__":
    # Run the service
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,  # Keep original port for backend compatibility
        log_level="info",
        reload=False  # Set to True for development
    )