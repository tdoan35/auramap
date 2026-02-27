import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (one level up from backend/)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_TTS_VOICE_ID = os.getenv("MINIMAX_TTS_VOICE_ID", "English_CalmWoman")

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_DEFAULT_REGION = os.getenv("AWS_DEFAULT_REGION", "us-west-2")
AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN", "")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

NEO4J_URI = os.getenv("NEO4J_URI", "")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

DD_API_KEY = os.getenv("DD_API_KEY", "")
DD_APP_KEY = os.getenv("DD_APP_KEY", "")
DD_SERVICE = os.getenv("DD_SERVICE", "auramap")
DD_ENV = os.getenv("DD_ENV", "hackathon")

BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))

AUDIO_STORAGE_PATH = os.getenv("AUDIO_STORAGE_PATH", "./audio_cache")

# Bedrock model ID — Claude 3.5 Sonnet v2 (allowed by event account)
BEDROCK_MODEL_ID = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
