"""Зависимости FastAPI: определяем, кто делает запрос."""
import time
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException

from .services import find
from .storage import db


# Имя параметра совпадает с именем cookie (config.SESSION_COOKIE)
async def get_current_user(session_id: Annotated[str | None, Cookie()] = None) -> dict:
    session = db.data["sessions"].get(session_id) if session_id else None
    if session is None:
        raise HTTPException(status_code=401, detail="Требуется вход")

    if session["expires_at"] < time.time():
        del db.data["sessions"][session_id]
        db.save()
        raise HTTPException(status_code=401, detail="Сессия истекла, войдите снова")

    user = find(db.data["users"], session["user_id"])
    if user is None:
        raise HTTPException(status_code=401, detail="Требуется вход")
    return user


async def require_admin(user: Annotated[dict, Depends(get_current_user)]) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Нужны права администратора")
    return user


CurrentUser = Annotated[dict, Depends(get_current_user)]
AdminUser = Annotated[dict, Depends(require_admin)]
