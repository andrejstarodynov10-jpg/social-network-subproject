"""Точка входа временного бэкенда.

Запуск (из папки backend/):
    uvicorn app.main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config
from .routers import announcements, auth, comments, news, posts, users
from .seed import seed_if_empty
from .storage import db

config.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.load()
    seed_if_empty(db)
    yield


app = FastAPI(title="Social Network (временный бэкенд)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=config.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(news.router)
app.include_router(announcements.router)

# Картинки новостей доступны по адресу /uploads/<имя файла>
app.mount("/uploads", StaticFiles(directory=config.UPLOADS_DIR), name="uploads")


@app.get("/", tags=["service"])
async def root():
    return {"status": "ok", "docs": "/docs"}
