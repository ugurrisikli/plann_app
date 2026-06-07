from fastapi import APIRouter, Request
from core.config import get_settings
from core.middleware import get_current_user
from supabase import create_client
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/stats", tags=["stats"])

LEVELS = [
    (0,   "Başlangıç"),
    (5,   "Yola Çıktı"),
    (15,  "Ritim Buluyor"),
    (30,  "Planlama Uzmanı"),
    (60,  "Haftanın Efendisi"),
    (100, "Akış Ustası"),
    (150, "Zaman Alchemisti"),
    (250, "Vizyon Sahibi"),
    (400, "Stratejist"),
    (600, "Zaman Mimarı"),
]


def get_supabase():
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_key)


def _planning_week_start() -> str:
    """plan.py ile tutarlı: Per+ → gelecek Pzt, Pzt-Çar → bu Pzt."""
    today = datetime.now(timezone.utc)
    weekday = today.weekday()
    if weekday >= 3:
        monday = today + timedelta(days=7 - weekday)
    else:
        monday = today - timedelta(days=weekday)
    return monday.replace(hour=0, minute=0, second=0, microsecond=0).date().isoformat()


def _calc_level(total: int) -> tuple[int, str, int, int, int]:
    """(level, name, prev_threshold, next_threshold, pct_within_level)"""
    level_idx = 0
    for i, (threshold, _) in enumerate(LEVELS):
        if total >= threshold:
            level_idx = i

    level = level_idx + 1
    name = LEVELS[level_idx][1]
    prev = LEVELS[level_idx][0]
    nxt  = LEVELS[level_idx + 1][0] if level_idx + 1 < len(LEVELS) else LEVELS[-1][0]
    span = nxt - prev
    pct  = round((total - prev) / span * 100) if span > 0 else 100
    return level, name, prev, nxt, min(pct, 100)


@router.get("/progress")
async def get_progress(request: Request):
    user_data = get_current_user(request)
    user_id = user_data["user_id"]
    supabase = get_supabase()

    # ── Bu haftanın planı ──
    week_start = _planning_week_start()
    plan = (
        supabase.table("weekly_plans")
        .select("id")
        .eq("user_id", user_id)
        .eq("week_start_date", week_start)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    weekly_approved = weekly_total = 0
    if plan.data:
        tasks = (
            supabase.table("plan_tasks")
            .select("status")
            .eq("plan_id", plan.data[0]["id"])
            .neq("status", "rejected")
            .execute()
        )
        weekly_total    = len(tasks.data)
        weekly_approved = sum(1 for t in tasks.data if t["status"] == "approved")

    # ── Toplam plan sayısı ──
    total_res = (
        supabase.table("weekly_plans")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    total_plans = total_res.count or 0

    # ── Streak: son 12 haftada ardışık plan varlığı ──
    streak = 0
    check = datetime.now(timezone.utc)
    for _ in range(12):
        weekday = check.weekday()
        w_monday = (check - timedelta(days=weekday)).date().isoformat()
        has_plan = (
            supabase.table("weekly_plans")
            .select("id")
            .eq("user_id", user_id)
            .eq("week_start_date", w_monday)
            .limit(1)
            .execute()
        )
        if has_plan.data:
            streak += 1
            check  -= timedelta(weeks=1)
        else:
            break

    # ── Level ──
    level, level_name, _, next_threshold, level_pct = _calc_level(total_plans)

    return {
        "weekly_approved":  weekly_approved,
        "weekly_total":     weekly_total,
        "streak_weeks":     streak,
        "total_plans":      total_plans,
        "level":            level,
        "level_name":       level_name,
        "level_pct":        level_pct,
        "next_threshold":   next_threshold,
    }
