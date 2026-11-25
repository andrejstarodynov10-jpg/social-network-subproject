"""Новости. Создавать, менять и удалять может только администратор."""
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from .. import config, services
from ..deps import AdminUser, CurrentUser
from ..schemas import CommentIn, CommentOut, NewsOut
from ..storage import db

router = APIRouter(prefix="/api/news", tags=["news"])

Title = Annotated[str, Form(min_length=1, max_length=150)]
Text = Annotated[str, Form(min_length=1, max_length=20000)]
Category = Annotated[str, Form(min_length=1, max_length=50)]


async def save_image(file: UploadFile) -> str:
    """Сохраняет картинку в папку uploads и возвращает имя файла."""
    extension = config.ALLOWED_IMAGE_TYPES.get(file.content_type)
    if extension is None:
        raise HTTPException(status_code=415, detail="Допустимы только PNG, JPEG, GIF и WEBP")
    content = await file.read(config.MAX_IMAGE_BYTES + 1)
    if len(content) > config.MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Картинка больше 5 МБ")
    config.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid4().hex}{extension}"
    (config.UPLOADS_DIR / name).write_bytes(content)
    return name


def delete_image(name: str | None) -> None:
    if name:
        (config.UPLOADS_DIR / name).unlink(missing_ok=True)


# Путь "/categories" объявлен раньше "/{news_id}" намеренно
@router.get("/categories", response_model=list[str])
async def list_categories(me: CurrentUser):
    return sorted({n["category"] for n in db.data["news"]})


@router.get("", response_model=list[NewsOut])
async def list_news(
    me: CurrentUser,
    category: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    items = db.data["news"]
    if category:
        items = [n for n in items if n["category"] == category]
    items = sorted(items, key=lambda n: (n["created_at"], n["id"]), reverse=True)
    return [services.news_out(n) for n in items[offset : offset + limit]]


@router.get("/{news_id}", response_model=NewsOut)
async def get_news(news_id: int, me: CurrentUser):
    news = services.get_or_404(db.data["news"], news_id, "Новость")
    return services.news_out(news)


@router.post("", response_model=NewsOut, status_code=201)
async def create_news(
    title: Title,
    text: Text,
    category: Category,
    admin: AdminUser,
    image: UploadFile | None = File(default=None),
):
    image_name = await save_image(image) if image is not None and image.filename else None
    now = services.now_iso()
    news = {
        "id": db.next_id("news"),
        "title": title.strip(),
        "text": text.strip(),
        "category": category.strip(),
        "image": image_name,
        "author_id": admin["id"],
        "created_at": now,
        "updated_at": now,
    }
    db.data["news"].append(news)
    db.save()
    return services.news_out(news)


@router.put("/{news_id}", response_model=NewsOut)
async def update_news(
    news_id: int,
    title: Title,
    text: Text,
    category: Category,
    admin: AdminUser,
    image: UploadFile | None = File(default=None),
    remove_image: Annotated[bool, Form()] = False,
):
    news = services.get_or_404(db.data["news"], news_id, "Новость")
    if image is not None and image.filename:
        new_name = await save_image(image)
        delete_image(news["image"])
        news["image"] = new_name
    elif remove_image:
        delete_image(news["image"])
        news["image"] = None
    news["title"] = title.strip()
    news["text"] = text.strip()
    news["category"] = category.strip()
    news["updated_at"] = services.now_iso()
    db.save()
    return services.news_out(news)


@router.delete("/{news_id}", status_code=204)
async def delete_news(news_id: int, admin: AdminUser):
    news = services.get_or_404(db.data["news"], news_id, "Новость")
    delete_image(news["image"])
    db.data["news"].remove(news)
    services.remove_comments_of("news", news_id)
    db.save()


@router.get("/{news_id}/comments", response_model=list[CommentOut])
async def list_news_comments(news_id: int, me: CurrentUser):
    services.get_or_404(db.data["news"], news_id, "Новость")
    return services.list_comments("news", news_id)


@router.post("/{news_id}/comments", response_model=CommentOut, status_code=201)
async def create_news_comment(news_id: int, data: CommentIn, me: CurrentUser):
    services.get_or_404(db.data["news"], news_id, "Новость")
    return services.add_comment("news", news_id, me["id"], data.text)
