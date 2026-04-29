from typing import Annotated
import psutil
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.deps import get_db
from app.modules.users.model import User

router = APIRouter()


class SystemStatsResponse(BaseModel):
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    active_users: int
    total_users: int
    uptime_seconds: float
    timestamp: str


def get_uptime_seconds() -> float:
    boot_time = psutil.boot_time()
    return datetime.now().timestamp() - boot_time


@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(db: Annotated[AsyncSession, Depends(get_db)]):
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    active_users_result = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    active_users = active_users_result.scalar() or 0

    return SystemStatsResponse(
        cpu_percent=round(cpu, 1),
        memory_percent=round(mem.percent, 1),
        memory_used_mb=round(mem.used / 1024 / 1024, 1),
        memory_total_mb=round(mem.total / 1024 / 1024, 1),
        disk_percent=round(disk.percent, 1),
        disk_used_gb=round(disk.used / 1024 / 1024 / 1024, 1),
        disk_total_gb=round(disk.total / 1024 / 1024 / 1024, 1),
        active_users=active_users,
        total_users=total_users,
        uptime_seconds=round(get_uptime_seconds()),
        timestamp=datetime.utcnow().isoformat(),
    )
