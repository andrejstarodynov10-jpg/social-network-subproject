"""Оповещения (объявления для всех пользователей). Создаёт и удаляет только админ."""
from fastapi import APIRouter

from .. import services
from ..deps import AdminUser, CurrentUser
from ..schemas import AnnouncementIn, AnnouncementOut
from ..storage import db

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementOut])
async def list_announcements(me: CurrentUser):
    items = sorted(
        db.data["announcements"], key=lambda a: (a["created_at"], a["id"]), reverse=True
    )
    return [services.announcement_out(a) for a in items]


@router.post("", response_model=AnnouncementOut, status_code=201)
async def create_announcement(data: AnnouncementIn, admin: AdminUser):
    announcement = {
        "id": db.next_id("announcements"),
        "title": data.title,
        "text": data.text,
        "author_id": admin["id"],
        "created_at": services.now_iso(),
    }
    db.data["announcements"].append(announcement)
    db.save()
    return services.announcement_out(announcement)


@router.delete("/{announcement_id}", status_code=204)
async def delete_announcement(announcement_id: int, admin: AdminUser):
    announcement = services.get_or_404(db.data["announcements"], announcement_id, "Оповещение")
    db.data["announcements"].remove(announcement)
    db.save()
