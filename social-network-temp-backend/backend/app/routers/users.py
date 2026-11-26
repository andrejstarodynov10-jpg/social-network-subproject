"""Профили пользователей."""
from typing import Annotated

from fastapi import APIRouter, Query

from .. import services
from ..deps import CurrentUser
from ..schemas import PostOut, ProfileUpdateIn, UserOut
from ..storage import db

router = APIRouter(prefix="/api/users", tags=["users"])


# Путь "/me" объявлен раньше "/{user_id}" намеренно
@router.patch("/me", response_model=UserOut)
async def update_my_profile(data: ProfileUpdateIn, me: CurrentUser):
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        if value is not None:
            me[field] = value
    db.save()
    return services.user_out(me)


@router.get("/{user_id}", response_model=UserOut)
async def get_profile(user_id: int, me: CurrentUser):
    user = services.get_or_404(db.data["users"], user_id, "Пользователь")
    return services.user_out(user)


@router.get("/{user_id}/posts", response_model=list[PostOut])
async def get_user_posts(
    user_id: int,
    me: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    services.get_or_404(db.data["users"], user_id, "Пользователь")
    posts = [p for p in db.data["posts"] if p["author_id"] == user_id]
    posts.sort(key=lambda p: (p["created_at"], p["id"]), reverse=True)
    return [services.post_out(p, me) for p in posts[offset : offset + limit]]
