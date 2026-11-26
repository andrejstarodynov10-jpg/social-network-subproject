"""Pydantic-схемы: что принимает и что возвращает API."""
from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

Username = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_]+$"),
]
Password = Annotated[str, StringConstraints(min_length=8, max_length=128)]
DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Bio = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]
PostText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
CommentText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
AnnouncementTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
AnnouncementText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


# ---------- Входные данные ----------

class RegisterIn(BaseModel):
    username: Username
    password: Password
    display_name: DisplayName | None = None


class LoginIn(BaseModel):
    username: str
    password: str


class ProfileUpdateIn(BaseModel):
    display_name: DisplayName | None = None
    bio: Bio | None = None


class PostIn(BaseModel):
    text: PostText


class CommentIn(BaseModel):
    text: CommentText


class AnnouncementIn(BaseModel):
    title: AnnouncementTitle
    text: AnnouncementText


# ---------- Выходные данные ----------

class AuthorOut(BaseModel):
    id: int
    username: str
    display_name: str


class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    bio: str
    role: Literal["admin", "user"]
    created_at: str


class PostOut(BaseModel):
    id: int
    text: str
    created_at: str
    author: AuthorOut
    likes_count: int
    liked_by_me: bool
    comments_count: int


class CommentOut(BaseModel):
    id: int
    text: str
    created_at: str
    author: AuthorOut


class NewsOut(BaseModel):
    id: int
    title: str
    text: str
    category: str
    image_url: str | None
    created_at: str
    updated_at: str
    author: AuthorOut
    comments_count: int


class AnnouncementOut(BaseModel):
    id: int
    title: str
    text: str
    created_at: str
    author: AuthorOut
