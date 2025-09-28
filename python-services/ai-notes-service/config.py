# AI Notes Service Configuration
import os
from pathlib import Path

# Service Configuration
SERVICE_NAME = "ai-notes-service"
SERVICE_VERSION = "2.0.0"
SERVICE_PORT = 8003
SERVICE_HOST = "0.0.0.0"

# AI Model Configuration
WHISPER_MODEL_SIZE = "base"  # tiny, base, small, medium, large
SUMMARIZATION_MODEL = "facebook/bart-large-cnn"
QUESTION_GENERATION_MODEL = "valhalla/t5-small-qg-hl"
SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"
SPACY_MODEL = "en_core_web_sm"

# Processing Configuration
MAX_VIDEO_SIZE_MB = 500
MAX_TEXT_LENGTH = 10000
CHUNK_SIZE = 1024
MAX_SUMMARY_LENGTH = 150
MIN_SUMMARY_LENGTH = 30
MAX_QUESTIONS = 10
MAX_CONCEPTS = 15
MAX_FLASHCARDS = 10
MAX_TIMELINE_ITEMS = 8

# Device Configuration
FORCE_CPU = os.getenv("FORCE_CPU", "false").lower() == "true"

# Paths
BASE_DIR = Path(__file__).parent
TEMP_DIR = BASE_DIR / "temp"
MODELS_DIR = BASE_DIR / "models"
UPLOADS_DIR = BASE_DIR / "uploads"

# Create directories
TEMP_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

# CORS Origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:5000",
    "https://*.vercel.app",
    "https://*.ngrok.io"
]

# Integration URLs
CAPTION_SERVICE_URL = "http://localhost:8001"
TRANSLATION_SERVICE_URL = "http://localhost:8002" 
AUDIO_SERVICE_URL = "http://localhost:8004"

# Feature Flags
ENABLE_VIDEO_PROCESSING = True
ENABLE_TEXT_PROCESSING = True
ENABLE_REAL_TIME_PROCESSING = True
ENABLE_WEBSOCKET = True
ENABLE_INTEGRATION_SERVICES = True

# Logging Configuration
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Performance Settings
MODEL_CACHE_SIZE = 4
BATCH_SIZE = 8
MAX_WORKERS = 2
TIMEOUT_SECONDS = 300

# Quality Settings
MIN_CONFIDENCE_THRESHOLD = 0.5
MIN_SENTENCE_LENGTH = 10
MAX_SENTENCE_LENGTH = 200