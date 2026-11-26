"""Хранилище данных: один JSON-файл, весь набор данных держим в памяти.

Все обработчики запросов в этом проекте объявлены как `async def`, поэтому
выполняются в одном потоке по очереди, и блокировки здесь не нужны.
"""
import copy
import json
import os

from . import config

EMPTY_DATA = {
    "counters": {},      # последний выданный id для каждой коллекции
    "users": [],
    "sessions": {},      # токен -> {"user_id": ..., "expires_at": ...}
    "posts": [],
    "comments": [],
    "news": [],
    "announcements": [],
}


class Database:
    def __init__(self, path):
        self.path = path
        self.data = copy.deepcopy(EMPTY_DATA)

    def load(self):
        """Читает файл. Если его нет, создаёт пустой."""
        if self.path.exists():
            loaded = json.loads(self.path.read_text(encoding="utf-8"))
            self.data = copy.deepcopy(EMPTY_DATA)
            self.data.update(loaded)
        else:
            self.data = copy.deepcopy(EMPTY_DATA)
            self.save()

    def save(self):
        """Записывает данные в файл (через временный файл, чтобы не испортить данные)."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self.path.with_suffix(".tmp")
        tmp_path.write_text(
            json.dumps(self.data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        os.replace(tmp_path, self.path)

    def next_id(self, collection):
        """Выдаёт следующий id для коллекции (1, 2, 3, ...)."""
        new_id = self.data["counters"].get(collection, 0) + 1
        self.data["counters"][collection] = new_id
        return new_id


db = Database(config.DB_PATH)
