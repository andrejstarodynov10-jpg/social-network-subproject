"""Посты, лайки и комментарии к постам."""
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from .. import services
from ..deps import CurrentUser
from ..schemas import CommentIn, CommentOut, PostIn, PostOut
from ..storage import db

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.get("", response_model=list[PostOut])
async def list_posts(
    me: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    """Лента: новые посты сверху."""
    posts = sorted(db.data["posts"], key=lambda p: (p["created_at"], p["id"]), reverse=True)
    return [services.post_out(p, me) for p in posts[offset : offset + limit]]


@router.post("", response_model=PostOut, status_code=201)
async def create_post(data: PostIn, me: CurrentUser):
    post = {
        "id": db.next_id("posts"),
        "author_id": me["id"],
        "text": data.text,
        "created_at": services.now_iso(),
        "likes": [],
    }
    db.data["posts"].append(post)
    db.save()
    return services.post_out(post, me)


@router.delete("/{post_id}", status_code=204)
async def delete_post(post_id: int, me: CurrentUser):
    post = services.get_or_404(db.data["posts"], post_id, "Пост")
    if post["author_id"] != me["id"] and me["role"] != "admin":
        raise HTTPException(status_code=403, detail="Можно удалять только свои посты")
    db.data["posts"].remove(post)
    services.remove_comments_of("post", post_id)
    db.save()


@router.post("/{post_id}/like", response_model=PostOut)
async def like_post(post_id: int, me: CurrentUser):
    post = services.get_or_404(db.data["posts"], post_id, "Пост")
    if me["id"] not in post["likes"]:
        post["likes"].append(me["id"])
        db.save()
    return services.post_out(post, me)


@router.delete("/{post_id}/like", response_model=PostOut)
async def unlike_post(post_id: int, me: CurrentUser):
    post = services.get_or_404(db.data["posts"], post_id, "Пост")
    if me["id"] in post["likes"]:
        post["likes"].remove(me["id"])
        db.save()
    return services.post_out(post, me)


@router.get("/{post_id}/comments", response_model=list[CommentOut])
async def list_post_comments(post_id: int, me: CurrentUser):
    services.get_or_404(db.data["posts"], post_id, "Пост")
    return services.list_comments("post", post_id)


@router.post("/{post_id}/comments", response_model=CommentOut, status_code=201)
async def create_post_comment(post_id: int, data: CommentIn, me: CurrentUser):
    services.get_or_404(db.data["posts"], post_id, "Пост")
    return services.add_comment("post", post_id, me["id"], data.text)
