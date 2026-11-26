"""Регистрация, вход, выход, текущий пользователь."""
import time
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response

from .. import config, services
from ..deps import CurrentUser
from ..schemas import LoginIn, RegisterIn, UserOut
from ..security import hash_password, new_session_token, verify_password
from ..storage import db

router = APIRouter(prefix="/api/auth", tags=["auth"])


def start_session(response: Response, user_id: int) -> None:
    token = new_session_token()
    db.data["sessions"][token] = {
        "user_id": user_id,
        "expires_at": time.time() + config.SESSION_MAX_AGE,
    }
    db.save()
    response.set_cookie(
        key=config.SESSION_COOKIE,
        value=token,
        max_age=config.SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: RegisterIn, response: Response):
    taken = any(u["username"].lower() == data.username.lower() for u in db.data["users"])
    if taken:
        raise HTTPException(status_code=409, detail="Такой логин уже занят")

    user = {
        "id": db.next_id("users"),
        "username": data.username,
        "password_hash": hash_password(data.password),
        "display_name": data.display_name or data.username,
        "bio": "",
        "role": "user",
        "created_at": services.now_iso(),
    }
    db.data["users"].append(user)
    db.save()
    start_session(response, user["id"])
    return services.user_out(user)


@router.post("/login", response_model=UserOut)
async def login(data: LoginIn, response: Response):
    user = next(
        (u for u in db.data["users"] if u["username"].lower() == data.username.strip().lower()),
        None,
    )
    if user is None or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    start_session(response, user["id"])
    return services.user_out(user)


@router.post("/logout", status_code=204)
async def logout(response: Response, session_id: Annotated[str | None, Cookie()] = None):
    if session_id and session_id in db.data["sessions"]:
        del db.data["sessions"][session_id]
        db.save()
    response.delete_cookie(key=config.SESSION_COOKIE, path="/")


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return services.user_out(user)
