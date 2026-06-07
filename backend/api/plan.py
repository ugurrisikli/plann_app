from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from core.config import get_settings
from core.middleware import get_current_user
from services.google.auth import credentials_from_token_data, refresh_if_expired, token_data_from_credentials
from services.google.calendar import create_event
from supabase import create_client
from datetime import datetime, timedelta, timezone
import agents.gmail_agent as gmail_agent
import agents.sheets_agent as sheets_agent
import agents.calendar_agent as calendar_agent
import agents.traffic_agent as traffic_agent
import agents.planning_agent as planning_agent
from core.orchestrator import run_parallel

router = APIRouter(prefix="/api/plan", tags=["plan"])


def get_supabase():
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_key)


class TaskUpdatePayload(BaseModel):
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    date: Optional[str] = None
    status: Optional[str] = None


class ApprovePayload(BaseModel):
    task_ids: Optional[list[str]] = None  # None → tümünü onayla


@router.get("/weekly")
async def get_weekly_plan(request: Request):
    user_data = get_current_user(request)
    supabase = get_supabase()

    week_start = _current_week_monday().date().isoformat()

    plan = (
        supabase.table("weekly_plans")
        .select("id, status, created_at")
        .eq("user_id", user_data["user_id"])
        .eq("week_start_date", week_start)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not plan.data:
        return {"plan": None, "tasks": []}

    plan_id = plan.data[0]["id"]
    tasks = (
        supabase.table("plan_tasks")
        .select("*")
        .eq("plan_id", plan_id)
        .neq("status", "rejected")
        .order("start_time")
        .execute()
    )
    return {"plan": plan.data[0], "tasks": tasks.data}


@router.post("/generate")
async def generate_plan(request: Request):
    """Haftalık planı üret ve DB'ye kaydet."""
    user_data = get_current_user(request)
    supabase = get_supabase()

    db_user = supabase.table("users").select("*").eq("id", user_data["user_id"]).execute()
    if not db_user.data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    db_user = db_user.data[0]

    credentials = credentials_from_token_data(db_user)
    credentials = refresh_if_expired(credentials)

    week_start = _current_week_monday()

    parallel_tasks = [
        (gmail_agent.run, {"credentials": credentials}),
        (calendar_agent.run, {"credentials": credentials, "week_start": week_start}),
    ]
    sheets_file_id = db_user.get("sheets_file_id")
    if sheets_file_id:
        parallel_tasks.append(
            (sheets_agent.run, {"credentials": credentials, "spreadsheet_id": sheets_file_id})
        )

    reports = await run_parallel(parallel_tasks)
    gmail_report = reports[0]
    cal_report = reports[1]
    sheets_report = reports[2] if sheets_file_id else None

    gmail_tasks = gmail_report.result.get("tasks", []) if gmail_report.status != "failed" else []
    sheets_tasks = sheets_report.result.get("tasks", []) if sheets_report and sheets_report.status != "failed" else []
    free_slots = cal_report.result.get("free_slots", []) if cal_report.status != "failed" else []
    located_events = cal_report.result.get("located_events", [])

    traffic_legs = []
    home_address = db_user.get("home_address", "")
    if located_events and home_address:
        legs = [
            {"from": home_address, "to": e["location"], "label": e["title"]}
            for e in located_events if e.get("location")
        ]
        if legs:
            tr = await traffic_agent.run(legs)
            traffic_legs = tr.result.get("legs", [])

    plan_report = await planning_agent.run(
        gmail_tasks=gmail_tasks,
        sheets_tasks=sheets_tasks,
        free_slots=free_slots,
        traffic_legs=traffic_legs,
        week_start=week_start,
        user_preferences=db_user.get("preferences", {}),
    )

    plan_items = plan_report.result.get("plan", [])

    # DB'ye kaydet
    week_start_str = week_start.date().isoformat()
    plan_insert = supabase.table("weekly_plans").insert({
        "user_id": user_data["user_id"],
        "week_start_date": week_start_str,
        "status": "draft",
    }).execute()
    plan_id = plan_insert.data[0]["id"]

    task_rows = []
    for order, item in enumerate(plan_items):
        task_rows.append({
            "plan_id": plan_id,
            "title": item.get("title", ""),
            "description": item.get("reasoning", ""),
            "start_time": f"{item.get('date')}T{item.get('start_time')}:00",
            "end_time": f"{item.get('date')}T{item.get('end_time')}:00",
            "source": item.get("source", "manual"),
            "priority": item.get("priority", "medium"),
            "status": "pending",
            "order": order,
        })
    if task_rows:
        supabase.table("plan_tasks").insert(task_rows).execute()

    # Token yenilendiyse kaydet
    new_token = token_data_from_credentials(credentials)
    supabase.table("users").update({
        "google_access_token": new_token["access_token"],
        "token_expiry": new_token["token_expiry"],
    }).eq("id", user_data["user_id"]).execute()

    return {
        "plan_id": plan_id,
        "tasks": task_rows,
        "summary": plan_report.result.get("summary", ""),
        "warnings": plan_report.result.get("warnings", []),
    }


@router.patch("/task/{task_id}")
async def update_task(task_id: str, payload: TaskUpdatePayload, request: Request):
    user_data = get_current_user(request)
    supabase = get_supabase()

    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok.")

    supabase.table("plan_tasks").update(data).eq("id", task_id).execute()
    return {"ok": True}


@router.post("/approve")
async def approve_tasks(request: Request, payload: ApprovePayload):
    """Görevleri onayla ve Google Calendar'a yaz."""
    user_data = get_current_user(request)
    supabase = get_supabase()

    db_user = supabase.table("users").select("*").eq("id", user_data["user_id"]).execute()
    if not db_user.data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    db_user = db_user.data[0]

    credentials = credentials_from_token_data(db_user)
    credentials = refresh_if_expired(credentials)

    # Onaylanacak görevleri çek
    query = supabase.table("plan_tasks").select("*").eq("status", "pending")
    if payload.task_ids:
        query = query.in_("id", payload.task_ids)
    tasks = query.execute()

    written = []
    errors = []
    for task in tasks.data:
        try:
            start_dt = datetime.fromisoformat(task["start_time"])
            end_dt = datetime.fromisoformat(task["end_time"])
            event_id = create_event(
                credentials=credentials,
                title=task["title"],
                description=task.get("description", ""),
                start_dt=start_dt,
                end_dt=end_dt,
            )
            supabase.table("plan_tasks").update({
                "status": "approved",
                "calendar_event_id": event_id,
            }).eq("id", task["id"]).execute()
            written.append(task["id"])
        except Exception as exc:
            errors.append(f"{task['title']}: {exc}")

    # Token yenilendiyse kaydet
    new_token = token_data_from_credentials(credentials)
    supabase.table("users").update({
        "google_access_token": new_token["access_token"],
        "token_expiry": new_token["token_expiry"],
    }).eq("id", user_data["user_id"]).execute()

    return {"written": len(written), "errors": errors}


@router.post("/approve/{task_id}")
async def approve_single_task(task_id: str, request: Request):
    return await approve_tasks(request, ApprovePayload(task_ids=[task_id]))


def _current_week_monday() -> datetime:
    """Perşembe veya sonrasında gelecek haftanın Pazartesi'sini döndür,
    Pazartesi-Çarşamba'da bu haftanın Pazartesi'sini döndür."""
    today = datetime.now(timezone.utc)
    weekday = today.weekday()  # Pzt=0 … Paz=6
    if weekday >= 3:  # Perşembe, Cuma, Cumartesi, Pazar → gelecek Pzt
        days_ahead = 7 - weekday
        monday = today + timedelta(days=days_ahead)
    else:
        monday = today - timedelta(days=weekday)
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)
