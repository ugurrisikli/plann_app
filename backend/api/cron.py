"""
Otomatik haftalık plan cron endpoint'i.
Railway cron job bu endpoint'i çağırır:
  POST /api/cron/weekly-plan
  Header: X-Cron-Secret: <CRON_SECRET env var>

Railway cron config: her pazartesi 07:00 İstanbul saati
  0 4 * * 1  (UTC)
"""
from fastapi import APIRouter, HTTPException, Header
from core.config import get_settings
from supabase import create_client
from services.google.auth import credentials_from_token_data, refresh_if_expired, token_data_from_credentials
from core.orchestrator import run_parallel
import agents.gmail_agent as gmail_agent
import agents.sheets_agent as sheets_agent
import agents.calendar_agent as calendar_agent
import agents.traffic_agent as traffic_agent
import agents.planning_agent as planning_agent
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/cron", tags=["cron"])


def get_supabase():
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_key)


@router.post("/weekly-plan")
async def auto_weekly_plan(x_cron_secret: str = Header(...)):
    settings = get_settings()
    cron_secret = getattr(settings, "cron_secret", "")
    if not cron_secret or x_cron_secret != cron_secret:
        raise HTTPException(status_code=401, detail="Yetkisiz")

    supabase = get_supabase()
    today_weekday = datetime.now(timezone.utc).weekday()  # 0=Pzt

    # Bugün planlama günü olan kullanıcıları çek
    users = (
        supabase.table("users")
        .select("id, email, google_access_token, google_refresh_token, token_expiry, sheets_file_id, home_address, planning_day")
        .eq("planning_day", today_weekday)
        .execute()
    )

    results = {"generated": 0, "skipped": 0, "errors": []}

    for user in users.data:
        try:
            credentials = credentials_from_token_data(user)
            credentials = await refresh_if_expired(credentials)

            week_start = _current_week_monday()
            parallel_tasks = [
                (gmail_agent.run, {"credentials": credentials}),
                (calendar_agent.run, {"credentials": credentials, "week_start": week_start}),
            ]
            sheets_id = user.get("sheets_file_id")
            if sheets_id:
                parallel_tasks.append(
                    (sheets_agent.run, {"credentials": credentials, "spreadsheet_id": sheets_id})
                )

            reports = await run_parallel(parallel_tasks)
            gmail_tasks = reports[0].result.get("tasks", []) if reports[0].status != "failed" else []
            free_slots = reports[1].result.get("free_slots", []) if reports[1].status != "failed" else []
            sheets_tasks = reports[2].result.get("tasks", []) if sheets_id and reports[2].status != "failed" else []

            plan_report = await planning_agent.run(
                gmail_tasks=gmail_tasks,
                sheets_tasks=sheets_tasks,
                free_slots=free_slots,
                traffic_legs=[],
                week_start=week_start,
                user_preferences={},
            )
            plan_items = plan_report.result.get("plan", [])

            week_start_str = week_start.date().isoformat()
            plan_insert = supabase.table("weekly_plans").insert({
                "user_id": user["id"],
                "week_start_date": week_start_str,
                "status": "draft",
            }).execute()
            plan_id = plan_insert.data[0]["id"]

            task_rows = [
                {
                    "plan_id": plan_id,
                    "title": item.get("title", ""),
                    "description": item.get("reasoning", ""),
                    "start_time": f"{item.get('date')}T{item.get('start_time')}:00",
                    "end_time": f"{item.get('date')}T{item.get('end_time')}:00",
                    "source": item.get("source", "manual"),
                    "priority": item.get("priority", "medium"),
                    "status": "pending",
                    "order": i,
                }
                for i, item in enumerate(plan_items)
            ]
            if task_rows:
                supabase.table("plan_tasks").insert(task_rows).execute()

            # Token yenilendiyse kaydet
            new_token = token_data_from_credentials(credentials)
            supabase.table("users").update({
                "google_access_token": new_token["access_token"],
                "token_expiry": new_token["token_expiry"],
            }).eq("id", user["id"]).execute()

            results["generated"] += 1

        except Exception as exc:
            results["errors"].append(f"{user.get('email', user['id'])}: {exc}")
            results["skipped"] += 1

    return results


def _current_week_monday() -> datetime:
    today = datetime.now(timezone.utc)
    monday = today - timedelta(days=today.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)
