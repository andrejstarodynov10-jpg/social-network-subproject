"""Удаление комментария (общее для постов и новостей)."""
from fastapi import APIRouter, HTTPException

from .. import services
from ..deps import CurrentUser
from ..storage import db

router = APIRouter(prefix="/api/comments", tags=["comments"])


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(comment_id: int, me: CurrentUser):
    comment = services.get_or_404(db.data["comments"], comment_id, "Комментарий")
    if comment["author_id"] != me["id"] and me["role"] != "admin":
        raise HTTPException(status_code=403, detail="Можно удалять только свои комментарии")
    db.data["comments"].remove(comment)
    db.save()
