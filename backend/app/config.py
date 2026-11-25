"""Настройки временного бэкенда."""
from pathlib import Path

# Папка backend/
BASE_DIR = Path(__file__).resolve().parent.parent

# Все данные лежат в одном JSON-файле
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "db.json"

# Загруженные картинки новостей
UPLOADS_DIR = BASE_DIR / "uploads"

# Сессии: имя cookie и срок жизни (7 суток)
# Внимание: имя совпадает с параметром session_id в deps.py
SESSION_COOKIE = "session_id"
SESSION_MAX_AGE = 7 * 24 * 60 * 60

# Картинки новостей
MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
}

# CORS: разрешаем фронтенд с localhost / 127.0.0.1 на любом порту.
# Важно: открывайте фронтенд и обращайтесь к API через один и тот же хост
# (везде localhost), иначе cookie сессии не будет отправляться.
CORS_ORIGIN_REGEX = r"^http://(localhost|127\.0\.0\.1)(:\d+)?$"
