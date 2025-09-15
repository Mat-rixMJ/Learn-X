# Python Translation Service for Multi-Language Captions
# Using Hugging Face Transformers and multiple translation backends

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Union
import asyncio
import logging
import time
import hashlib
import json
from datetime import datetime, timedelta
import uvicorn

import os

# Translation libraries with tolerant fallbacks (Python 3.13 removed cgi used by googletrans)
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM  # noqa: F401
    import torch  # noqa: F401
    import requests  # noqa: F401
    import aiohttp  # noqa: F401
    import sqlite3  # noqa: F401
    from concurrent.futures import ThreadPoolExecutor  # noqa: F401
except ImportError as e:
    print(f"Missing required core translation dependency: {e}")
    print("Install with: pip install transformers torch aiohttp")
    exit(1)

# googletrans is optional; may break on Python 3.13 due to deprecated cgi module
try:
    from googletrans import Translator as GoogleTranslator  # noqa: F401
except Exception as e:
    print(f"Google Translate fallback disabled: {e}")
    GoogleTranslator = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Learn-X Translation Service",
    description="Advanced multi-language translation with offline models and API fallbacks",
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

# Translation models and configuration
class TranslationConfig:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # Allow env override for smaller / faster model to avoid huge downloads during tests
        self.offline_model = os.getenv("TRANSLATION_MODEL", "facebook/nllb-200-distilled-600M")
        self.cache_duration = 3600  # 1 hour cache
        self.max_text_length = 1000
        self.batch_size = 8
        
        # Language mappings
        self.nllb_language_codes = {
            'en-US': 'eng_Latn', 'en-GB': 'eng_Latn',
            'hi-IN': 'hin_Deva', 'ta-IN': 'tam_Taml', 'te-IN': 'tel_Telu',
            'kn-IN': 'kan_Knda', 'ml-IN': 'mal_Mlym', 'bn-IN': 'ben_Beng',
            'gu-IN': 'guj_Gujr', 'mr-IN': 'mar_Deva', 'pa-IN': 'pan_Guru',
            'es-ES': 'spa_Latn', 'fr-FR': 'fra_Latn', 'de-DE': 'deu_Latn',
            'it-IT': 'ita_Latn', 'pt-BR': 'por_Latn', 'ja-JP': 'jpn_Jpan',
            'ko-KR': 'kor_Hang', 'zh-CN': 'zho_Hans', 'ar-SA': 'arb_Arab',
            'ru-RU': 'rus_Cyrl'
        }
        
        self.google_language_codes = {
            'en-US': 'en', 'hi-IN': 'hi', 'ta-IN': 'ta', 'te-IN': 'te',
            'kn-IN': 'kn', 'ml-IN': 'ml', 'bn-IN': 'bn', 'gu-IN': 'gu',
            'mr-IN': 'mr', 'pa-IN': 'pa', 'es-ES': 'es', 'fr-FR': 'fr',
            'de-DE': 'de', 'it-IT': 'it', 'pt-BR': 'pt', 'ja-JP': 'ja',
            'ko-KR': 'ko', 'zh-CN': 'zh', 'ar-SA': 'ar', 'ru-RU': 'ru'
        }

config = TranslationConfig()

# Pydantic models
class TranslationRequest(BaseModel):
    text: str
    target_language: str
    source_language: Optional[str] = "en-US"
    use_cache: Optional[bool] = True
    prefer_offline: Optional[bool] = True

class BatchTranslationRequest(BaseModel):
    texts: List[str]
    target_languages: List[str]
    source_language: Optional[str] = "en-US"
    use_cache: Optional[bool] = True

class TranslationResponse(BaseModel):
    success: bool
    translated_text: str
    original_text: str
    source_language: str
    target_language: str
    method: str
    confidence: float
    latency_ms: int
    from_cache: bool

# Translation cache management
class TranslationCache:
    def __init__(self):
        self.cache_file = "translation_cache.db"
        self.init_database()
        
    def init_database(self):
        """Initialize SQLite database for translation cache"""
        conn = sqlite3.connect(self.cache_file)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS translations (
                cache_key TEXT PRIMARY KEY,
                source_text TEXT,
                source_lang TEXT,
                target_lang TEXT,
                translated_text TEXT,
                method TEXT,
                confidence REAL,
                created_at TIMESTAMP,
                access_count INTEGER DEFAULT 1
            )
        ''')
        conn.commit()
        conn.close()
    
    def get_cache_key(self, text: str, source_lang: str, target_lang: str) -> str:
        """Generate cache key for translation"""
        key_string = f"{text.lower().strip()}_{source_lang}_{target_lang}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get_translation(self, text: str, source_lang: str, target_lang: str) -> Optional[Dict]:
        """Get cached translation"""
        cache_key = self.get_cache_key(text, source_lang, target_lang)
        
        conn = sqlite3.connect(self.cache_file)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT translated_text, method, confidence, created_at 
            FROM translations 
            WHERE cache_key = ? AND created_at > ?
        ''', (cache_key, datetime.now() - timedelta(seconds=config.cache_duration)))
        
        result = cursor.fetchone()
        
        if result:
            # Update access count
            cursor.execute('''
                UPDATE translations 
                SET access_count = access_count + 1 
                WHERE cache_key = ?
            ''', (cache_key,))
            conn.commit()
        
        conn.close()
        
        if result:
            return {
                "translated_text": result[0],
                "method": result[1],
                "confidence": result[2],
                "cached_at": result[3]
            }
        return None
    
    def set_translation(self, text: str, source_lang: str, target_lang: str,
                       translated_text: str, method: str, confidence: float):
        """Cache translation result"""
        cache_key = self.get_cache_key(text, source_lang, target_lang)
        
        conn = sqlite3.connect(self.cache_file)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO translations 
            (cache_key, source_text, source_lang, target_lang, translated_text, method, confidence, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (cache_key, text, source_lang, target_lang, translated_text, method, confidence, datetime.now()))
        conn.commit()
        conn.close()
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        conn = sqlite3.connect(self.cache_file)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM translations')
        total_translations = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM translations WHERE created_at > ?', 
                      (datetime.now() - timedelta(seconds=config.cache_duration),))
        active_translations = cursor.fetchone()[0]
        
        cursor.execute('SELECT SUM(access_count) FROM translations')
        total_accesses = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return {
            "total_translations": total_translations,
            "active_translations": active_translations,
            "total_accesses": total_accesses,
            "hit_rate": total_accesses / max(total_translations, 1)
        }

cache = TranslationCache()

# Translation services
class TranslationService:
    def __init__(self):
        self.offline_translator = None
        self.google_translator = GoogleTranslator() if GoogleTranslator else None
        self.models_loaded = False
        self.executor = ThreadPoolExecutor(max_workers=4)
        
    async def load_models(self):
        """Load offline translation models"""
        if self.models_loaded:
            return
            
        try:
            logger.info(f"Loading NLLB translation model on {config.device}")
            
            # Load the model in a separate thread to avoid blocking
            def load_model():
                return pipeline(
                    "translation",
                    model=config.offline_model,
                    device=0 if config.device == "cuda" else -1,
                    torch_dtype=torch.float16 if config.device == "cuda" else torch.float32,
                    model_kwargs={"cache_dir": "./models"}
                )
            
            loop = asyncio.get_event_loop()
            self.offline_translator = await loop.run_in_executor(self.executor, load_model)
            
            self.models_loaded = True
            logger.info("✅ Translation models loaded successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to load translation models: {e}")
            logger.info("🔄 Continuing with online-only translation services")
    
    async def translate_offline(self, text: str, source_lang: str, target_lang: str) -> Optional[Dict]:
        """Translate using offline NLLB model"""
        if not self.models_loaded or not self.offline_translator:
            return None
            
        try:
            # Map to NLLB language codes
            src_code = config.nllb_language_codes.get(source_lang)
            tgt_code = config.nllb_language_codes.get(target_lang)
            
            if not src_code or not tgt_code:
                return None
            
            # Perform translation
            def translate():
                return self.offline_translator(
                    text,
                    src_lang=src_code,
                    tgt_lang=tgt_code,
                    max_length=config.max_text_length
                )
            
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(self.executor, translate)
            
            return {
                "translated_text": result[0]["translation_text"],
                "confidence": 0.9,  # High confidence for offline model
                "method": "nllb_offline"
            }
            
        except Exception as e:
            logger.warning(f"Offline translation failed: {e}")
            return None
    
    async def translate_google(self, text: str, source_lang: str, target_lang: str) -> Optional[Dict]:
        """Translate using Google Translate API"""
        try:
            src_code = config.google_language_codes.get(source_lang, 'en')
            tgt_code = config.google_language_codes.get(target_lang, 'hi')
            
            def translate():
                return self.google_translator.translate(text, src=src_code, dest=tgt_code)
            
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(self.executor, translate)
            
            return {
                "translated_text": result.text,
                "confidence": 0.85,
                "method": "google_translate"
            }
            
        except Exception as e:
            logger.warning(f"Google Translate failed: {e}")
            return None
    
    async def translate_mymemory(self, text: str, source_lang: str, target_lang: str) -> Optional[Dict]:
        """Translate using MyMemory API"""
        try:
            src_code = config.google_language_codes.get(source_lang, 'en')
            tgt_code = config.google_language_codes.get(target_lang, 'hi')
            
            url = "https://api.mymemory.translated.net/get"
            params = {
                "q": text,
                "langpair": f"{src_code}|{tgt_code}"
            }
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=2)) as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get("responseStatus") == 200:
                            return {
                                "translated_text": data["responseData"]["translatedText"],
                                "confidence": data["responseData"].get("match", 0.7),
                                "method": "mymemory"
                            }
            
            return None
            
        except Exception as e:
            logger.warning(f"MyMemory translation failed: {e}")
            return None
    
    async def translate_text(self, text: str, source_lang: str, target_lang: str,
                           prefer_offline: bool = True, use_cache: bool = True) -> Dict:
        """Main translation function with multiple fallbacks"""
        start_time = time.time()
        
        # Check cache first
        cached_result = None
        if use_cache:
            cached_result = cache.get_translation(text, source_lang, target_lang)
            if cached_result:
                return TranslationResponse(
                    success=True,
                    translated_text=cached_result["translated_text"],
                    original_text=text,
                    source_language=source_lang,
                    target_language=target_lang,
                    method=cached_result["method"] + "_cached",
                    confidence=cached_result["confidence"],
                    latency_ms=int((time.time() - start_time) * 1000),
                    from_cache=True
                ).dict()
        
        # Translation service priority
        services = []
        if prefer_offline:
            services = [
                self.translate_offline,
                self.translate_mymemory,
                self.translate_google
            ]
        else:
            services = [
                self.translate_mymemory,
                self.translate_google,
                self.translate_offline
            ]
        
        # Try each service
        for service in services:
            try:
                result = await service(text, source_lang, target_lang)
                if result and result["translated_text"]:
                    # Cache the result
                    if use_cache:
                        cache.set_translation(
                            text, source_lang, target_lang,
                            result["translated_text"], result["method"], result["confidence"]
                        )
                    
                    return TranslationResponse(
                        success=True,
                        translated_text=result["translated_text"],
                        original_text=text,
                        source_language=source_lang,
                        target_language=target_lang,
                        method=result["method"],
                        confidence=result["confidence"],
                        latency_ms=int((time.time() - start_time) * 1000),
                        from_cache=False
                    ).dict()
                    
            except Exception as e:
                logger.warning(f"Translation service failed: {e}")
                continue
        
        # All services failed - return original text
        return TranslationResponse(
            success=False,
            translated_text=text,  # Fallback to original
            original_text=text,
            source_language=source_lang,
            target_language=target_lang,
            method="fallback",
            confidence=0.0,
            latency_ms=int((time.time() - start_time) * 1000),
            from_cache=False
        ).dict()

translation_service = TranslationService()

# API Routes

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    await translation_service.load_models()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Learn-X Translation Service",
        "status": "running",
        "models_loaded": translation_service.models_loaded,
        "device": config.device,
        "offline_model": config.offline_model,
        "supported_languages": list(config.nllb_language_codes.keys())
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    cache_stats = cache.get_stats()
    
    return {
        "status": "healthy",
        "models": {
            "offline_loaded": translation_service.models_loaded,
            "device": config.device,
            "model_name": config.offline_model
        },
        "cache": cache_stats,
        "system": {
            "cuda_available": torch.cuda.is_available(),
            "gpu_memory": torch.cuda.get_device_properties(0).total_memory if torch.cuda.is_available() else None
        },
        "performance": {
            "average_latency_ms": 50 if translation_service.models_loaded else 200,
            "cache_hit_rate": cache_stats["hit_rate"]
        },
        "timestamp": datetime.now().isoformat()
    }

@app.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """Translate text to target language"""
    
    # Validate input
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if len(request.text) > config.max_text_length:
        raise HTTPException(status_code=400, detail=f"Text too long (max {config.max_text_length} characters)")
    
    if request.target_language not in config.nllb_language_codes:
        raise HTTPException(status_code=400, detail=f"Unsupported target language: {request.target_language}")
    
    # Same language check
    if request.source_language == request.target_language:
        return TranslationResponse(
            success=True,
            translated_text=request.text,
            original_text=request.text,
            source_language=request.source_language,
            target_language=request.target_language,
            method="same_language",
            confidence=1.0,
            latency_ms=0,
            from_cache=False
        )
    
    # Perform translation
    result = await translation_service.translate_text(
        request.text,
        request.source_language,
        request.target_language,
        request.prefer_offline,
        request.use_cache
    )
    
    return TranslationResponse(**result)

@app.post("/translate/batch")
async def translate_batch(request: BatchTranslationRequest):
    """Translate texts to multiple languages"""
    
    if not request.texts:
        raise HTTPException(status_code=400, detail="No texts provided")
    
    if len(request.texts) > config.batch_size:
        raise HTTPException(status_code=400, detail=f"Too many texts (max {config.batch_size})")
    
    results = []
    
    # Process translations concurrently
    tasks = []
    for text in request.texts:
        for target_lang in request.target_languages:
            task = translation_service.translate_text(
                text, request.source_language, target_lang
            )
            tasks.append((text, target_lang, task))
    
    # Wait for all translations
    completed_tasks = await asyncio.gather(*[task for _, _, task in tasks], return_exceptions=True)
    
    # Organize results
    for i, (text, target_lang, _) in enumerate(tasks):
        result = completed_tasks[i]
        if isinstance(result, Exception):
            result = {
                "success": False,
                "translated_text": text,
                "original_text": text,
                "source_language": request.source_language,
                "target_language": target_lang,
                "method": "error",
                "confidence": 0.0,
                "latency_ms": 0,
                "from_cache": False,
                "error": str(result)
            }
        
        results.append(result)
    
    return {
        "success": True,
        "results": results,
        "total_translations": len(results),
        "source_language": request.source_language
    }

@app.get("/languages")
async def get_supported_languages():
    """Get supported languages"""
    return {
        "languages": {
            "nllb_codes": config.nllb_language_codes,
            "google_codes": config.google_language_codes
        },
        "total_languages": len(config.nllb_language_codes),
        "offline_model": config.offline_model
    }

@app.get("/cache/stats")
async def get_cache_stats():
    """Get translation cache statistics"""
    return cache.get_stats()

@app.delete("/cache/clear")
async def clear_cache():
    """Clear translation cache"""
    try:
        conn = sqlite3.connect(cache.cache_file)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM translations')
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Cache cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {e}")

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        log_level="info",
        reload=False
    )