from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from core.config import get_settings
from core.middleware import get_current_user
from services.google.auth import credentials_from_token_data, refresh_if_expired
from supabase import create_client

router = APIRouter(prefix="/api/settings", tags=["settings"])


def get_supabase():
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_key)


class PatchSettingsPayload(BaseModel):
    name: Optional[str] = None
    planning_day: Optional[int] = None
    work_start_hour: Optional[int] = None
    work_end_hour: Optional[int] = None
    home_address: Optional[str] = None
    work_address: Optional[str] = None
    sheets_file_id: Optional[str] = None


@router.get("/me")
async def get_settings_me(request: Request):
    user_data = get_current_user(request)
    supabase = get_supabase()

    row = supabase.table("users").select("*").eq("id", user_data["user_id"]).execute()
    if not row.data:
        return {}
    user = row.data[0]

    google_connected = bool(user.get("google_access_token"))

    return {
        "name": user.get("name") or "",
        "email": user.get("email") or "",
        "auth_provider": user.get("auth_provider") or "email",
        "google_connected": google_connected,
        "planning_day": user.get("planning_day") if user.get("planning_day") is not None else 0,
        "work_start_hour": user.get("work_start_hour") if user.get("work_start_hour") is not None else 9,
        "work_end_hour": user.get("work_end_hour") if user.get("work_end_hour") is not None else 20,
        "home_address": user.get("home_address") or "",
        "work_address": user.get("work_address") or "",
        "sheets_file_id": user.get("sheets_file_id") or "",
    }


@router.patch("/me")
async def patch_settings(request: Request, payload: PatchSettingsPayload):
    user_data = get_current_user(request)
    supabase = get_supabase()

    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if data:
        supabase.table("users").update(data).eq("id", user_data["user_id"]).execute()

    # home_address değiştiyse me_time_profiles'a da sync et
    if payload.home_address is not None:
        profile_res = (
            supabase.table("me_time_profiles")
            .select("id")
            .eq("user_id", user_data["user_id"])
            .execute()
        )
        if profile_res.data:
            supabase.table("me_time_profiles").update(
                {"home_address": payload.home_address}
            ).eq("user_id", user_data["user_id"]).execute()

    return {"ok": True}


@router.get("/sheets-files")
async def list_sheets_files(request: Request):
    """Google Drive'daki Sheets dosyalarını listele."""
    user_data = get_current_user(request)
    supabase = get_supabase()

    row = supabase.table("users").select("*").eq("id", user_data["user_id"]).execute()
    if not row.data or not row.data[0].get("google_access_token"):
        return {"files": []}

    user = row.data[0]
    try:
        credentials = credentials_from_token_data(user)
        credentials = refresh_if_expired(credentials)
        from services.google.drive import list_spreadsheets
        files = list_spreadsheets(credentials, max_results=30)
        return {"files": [{"id": f["id"], "name": f["name"]} for f in files], "needs_reconnect": False}
    except Exception as exc:
        err_str = str(exc).lower()
        # Drive scope eksik → kullanıcıya yeniden bağlanmasını söyle
        needs_reconnect = "invalid_scope" in err_str or "insufficient" in err_str or "forbidden" in err_str
        return {"files": [], "needs_reconnect": needs_reconnect}
