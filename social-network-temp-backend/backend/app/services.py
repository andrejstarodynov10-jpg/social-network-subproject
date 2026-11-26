"""Вспомогательные функции: поиск в данных и превращение записей в ответы API."""
from datetime import datetime, timezone

from fastapi import HTTPException

from .storage import db


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def find(collection: list, item_id: int):
    for item in collection:
        if item["id"] == item_id:
            return item
    return None


def get_or_404(collection: list, item_id: int, what: str):
    item = find(collection, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"{what} не найден(а)")
    return item


# ---------- Преобразование записей в ответы ----------

def author_out(user_id: int) -> dict:
    user = find(db.data["users"], user_id)
    return {"id": user["id"], "username": user["username"], "display_name": user["display_name"]}


def user_out(user: dict) -> dict:
    return {
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"],
        "bio": user["bio"],
        "role": user["role"],
        "created_at": user["created_at"],
    }


def comments_count(target_type: str, target_id: int) -> int:
    return sum(
        1
        for c in db.data["comments"]
        if c["target_type"] == target_type and c["target_id"] == target_id
    )


def post_out(post: dict, me: dict) -> dict:
    return {
        "id": post["id"],
        "text": post["text"],
        "created_at": post["created_at"],
        "author": author_out(post["author_id"]),
        "likes_count": len(post["likes"]),
        "liked_by_me": me["id"] in post["likes"],
        "comments_count": comments_count("post", post["id"]),
    }


def comment_out(comment: dict) -> dict:
    return {
        "id": comment["id"],
        "text": comment["text"],
        "created_at": comment["created_at"],
        "author": author_out(comment["author_id"]),
    }


def news_out(news: dict) -> dict:
    image = news["image"]
    return {
        "id": news["id"],
        "title": news["title"],
        "text": news["text"],
        "category": news["category"],
        "image_url": f"/uploads/{image}" if image else None,
        "created_at": news["created_at"],
        "updated_at": news["updated_at"],
        "author": author_out(news["author_id"]),
        "comments_count": comments_count("news", news["id"]),
    }


def announcement_out(announcement: dict) -> dict:
    return {
        "id": announcement["id"],
        "title": announcement["title"],
        "text": announcement["text"],
        "created_at": announcement["created_at"],
        "author": author_out(announcement["author_id"]),
    }


# ---------- Комментарии (общие для постов и новостей) ----------

def list_comments(target_type: str, target_id: int) -> list[dict]:
    items = [
        c
        for c in db.data["comments"]
        if c["target_type"] == target_type and c["target_id"] == target_id
    ]
    items.sort(key=lambda c: c["id"])
    return [comment_out(c) for c in items]


def add_comment(target_type: str, target_id: int, author_id: int, text: str) -> dict:
    comment = {
        "id": db.next_id("comments"),
        "target_type": target_type,
        "target_id": target_id,
        "author_id": author_id,
        "text": text,
        "created_at": now_iso(),
    }
    db.data["comments"].append(comment)
    db.save()
    return comment_out(comment)


def remove_comments_of(target_type: str, target_id: int) -> None:
    """Удаляет все комментарии к посту или новости (без сохранения файла)."""
    db.data["comments"] = [
        c
        for c in db.data["comments"]
        if not (c["target_type"] == target_type and c["target_id"] == target_id)
    ]
