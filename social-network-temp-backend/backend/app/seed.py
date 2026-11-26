"""Тестовые данные. Создаются при первом запуске, если база пустая."""
import struct
import zlib
from datetime import datetime, timedelta, timezone

from . import config
from .security import hash_password

ADMIN_LOGIN = "admin"
ADMIN_PASSWORD = "admin12345"
USER_PASSWORD = "user12345"


def _ago(hours: int) -> str:
    moment = datetime.now(timezone.utc) - timedelta(hours=hours)
    return moment.isoformat(timespec="seconds")


def _make_png(path, width: int, height: int, color: tuple) -> None:
    """Рисует одноцветную PNG-картинку (только стандартная библиотека)."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    row = b"\x00" + bytes(color) * width
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(row * height))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def seed_if_empty(db) -> None:
    if db.data["users"]:
        return

    data = db.data
    config.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # --- Пользователи ---
    def add_user(username, password, display_name, bio, role, hours_ago):
        user = {
            "id": db.next_id("users"),
            "username": username,
            "password_hash": hash_password(password),
            "display_name": display_name,
            "bio": bio,
            "role": role,
            "created_at": _ago(hours_ago),
        }
        data["users"].append(user)
        return user

    admin = add_user(ADMIN_LOGIN, ADMIN_PASSWORD, "Администратор", "Слежу за порядком в сети.", "admin", 500)
    anna = add_user("anna", USER_PASSWORD, "Анна", "Люблю фотографию и путешествия.", "user", 400)
    ivan = add_user("ivan", USER_PASSWORD, "Иван", "Пишу код по вечерам.", "user", 300)

    # --- Посты ---
    def add_post(author, text, hours_ago, likes):
        post = {
            "id": db.next_id("posts"),
            "author_id": author["id"],
            "text": text,
            "created_at": _ago(hours_ago),
            "likes": [u["id"] for u in likes],
        }
        data["posts"].append(post)
        return post

    p1 = add_post(anna, "Всем привет! Это мой первый пост в новой сети.", 48, [ivan, admin])
    p2 = add_post(ivan, "Сегодня разбирался с FastAPI, очень понравилось.", 30, [anna])
    p3 = add_post(anna, "Закат над городом, вид с крыши.", 20, [])
    p4 = add_post(admin, "Добро пожаловать! Правила сети будут опубликованы в новостях.", 10, [anna, ivan])
    add_post(ivan, "Кто знает хорошие материалы по Vue?", 2, [])

    # --- Комментарии ---
    def add_comment(target_type, target_id, author, text, hours_ago):
        data["comments"].append(
            {
                "id": db.next_id("comments"),
                "target_type": target_type,
                "target_id": target_id,
                "author_id": author["id"],
                "text": text,
                "created_at": _ago(hours_ago),
            }
        )

    add_comment("post", p1["id"], ivan, "Добро пожаловать, Анна!", 47)
    add_comment("post", p1["id"], admin, "Рады вас видеть.", 46)
    add_comment("post", p2["id"], anna, "Расскажи подробнее, что делал?", 29)
    add_comment("post", p3["id"], ivan, "Красиво!", 19)
    add_comment("post", p4["id"], anna, "Спасибо, жду правила.", 9)

    # --- Новости (у двух есть картинки) ---
    def add_news(title, text, category, image, hours_ago):
        news = {
            "id": db.next_id("news"),
            "title": title,
            "text": text,
            "category": category,
            "image": image,
            "author_id": admin["id"],
            "created_at": _ago(hours_ago),
            "updated_at": _ago(hours_ago),
        }
        data["news"].append(news)
        return news

    _make_png(config.UPLOADS_DIR / "seed-news-1.png", 600, 300, (74, 111, 165))
    _make_png(config.UPLOADS_DIR / "seed-news-2.png", 600, 300, (201, 123, 74))

    add_news(
        "Запуск социальной сети",
        "Сегодня мы открываем нашу социальную сеть. Регистрируйтесь, пишите посты, "
        "ставьте лайки и общайтесь в комментариях.\n\nСледите за новостями в этом разделе.",
        "Обновления",
        "seed-news-1.png",
        72,
    )
    n2 = add_news(
        "Правила сообщества",
        "Будьте вежливы, не публикуйте чужие личные данные и не рассылайте спам. "
        "Нарушители могут быть ограничены в правах.",
        "Правила",
        None,
        24,
    )
    add_news(
        "Встреча пользователей",
        "В конце месяца планируем онлайн-встречу. Подробности появятся в оповещениях.",
        "События",
        "seed-news-2.png",
        5,
    )
    add_comment("news", n2["id"], anna, "Всё понятно, спасибо!", 23)

    # --- Оповещения ---
    def add_announcement(title, text, hours_ago):
        data["announcements"].append(
            {
                "id": db.next_id("announcements"),
                "title": title,
                "text": text,
                "author_id": admin["id"],
                "created_at": _ago(hours_ago),
            }
        )

    add_announcement("Технические работы", "Завтра с 03:00 до 04:00 сеть может быть недоступна.", 12)
    add_announcement("Новая функция", "Теперь у новостей есть категории.", 3)

    db.save()
