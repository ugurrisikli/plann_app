from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from core.config import get_settings
from core.middleware import get_current_user
from services.google.auth import credentials_from_token_data, refresh_if_expired, token_data_from_credentials
import agents.me_time_agent as me_time_agent
import agents.location_agent as location_agent
from supabase import create_client

router = APIRouter(prefix="/api/me-time", tags=["me-time"])


def get_supabase():
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_key)


# ── Profil şeması ──────────────────────────────────────────────────────────────

class MeTimeProfilePayload(BaseModel):
    personality_score: Optional[int] = None          # 1-10
    social_preference: Optional[str] = None          # Yalnız|Arkadaşla|Aileyle|Karma
    crowd_tolerance: Optional[int] = None            # 1-5
    interests: Optional[list[str]] = None
    activity_goal: Optional[str] = None
    fitness_level: Optional[int] = None              # 1-5
    intensity_preference: Optional[str] = None       # Hafif|Orta|Yüksek
    constraints: Optional[str] = None
    duration_preference: Optional[str] = None        # 1-2 saat|2-4 saat|Yarım gün|Tam gün
    budget_range: Optional[str] = None               # Ücretsiz|0-200₺|200-500₺|500₺+
    preferred_time: Optional[str] = None             # Sabah|Öğleden sonra|Akşam
    city: Optional[str] = None
    district: Optional[str] = None
    home_address: Optional[str] = None
    has_car: Optional[bool] = None
    max_distance_km: Optional[int] = None
    indoor_outdoor: Optional[str] = None             # İç|Dış|Her ikisi
    weather_sensitivity: Optional[int] = None        # 1-5
    avoidances: Optional[str] = None


# ── Öneri şeması ──────────────────────────────────────────────────────────────

class SuggestPayload(BaseModel):
    mood_input: str


class AddToCalendarPayload(BaseModel):
    suggestion_id: str
    activity_index: int         # activities listesinde hangi aktivite
    venue_index: int = 0        # venues listesinde hangi mekan
    date: str                   # ISO tarih: "2026-06-14"
    start_time: str             # "15:00"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/profile")
async def get_profile(request: Request):
    user_data = get_current_user(request)
    supabase = get_supabase()

    result = (
        supabase.table("me_time_profiles")
        .select("*")
        .eq("user_id", user_data["user_id"])
        .execute()
    )
    if not result.data:
        return {"profile": None}
    return {"profile": result.data[0]}


@router.post("/profile")
async def upsert_profile(request: Request, payload: MeTimeProfilePayload):
    user_data = get_current_user(request)
    supabase = get_supabase()

    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    data["user_id"] = user_data["user_id"]

    existing = (
        supabase.table("me_time_profiles")
        .select("id")
        .eq("user_id", user_data["user_id"])
        .execute()
    )
    if existing.data:
        supabase.table("me_time_profiles").update(data).eq("user_id", user_data["user_id"]).execute()
    else:
        supabase.table("me_time_profiles").insert(data).execute()

    return {"ok": True}


@router.post("/suggest")
async def suggest(request: Request, payload: SuggestPayload):
    user_data = get_current_user(request)
    supabase = get_supabase()

    # Profili çek
    profile_result = (
        supabase.table("me_time_profiles")
        .select("*")
        .eq("user_id", user_data["user_id"])
        .execute()
    )
    profile = profile_result.data[0] if profile_result.data else {}

    city = profile.get("city", "İstanbul")
    home_address = profile.get("home_address", city)
    radius_km = profile.get("max_distance_km", 15)

    # 1. Me Time Agent → aktivite fikirleri
    me_time_report = await me_time_agent.run(profile=profile, mood_input=payload.mood_input)
    if me_time_report.status == "failed":
        raise HTTPException(status_code=502, detail="Me Time Agent çalışmadı.")

    activities = me_time_report.result.get("activities", [])
    mood_response = me_time_report.result.get("mood_response", "")

    # 2. Location Agent → gerçek mekanlar + trafik
    location_report = await location_agent.run(
        activities=activities,
        user_location=home_address,
        city=city,
        radius_km=radius_km,
    )
    enriched_activities = location_report.result.get("activities", activities)

    # 3. Öneriyi DB'ye kaydet
    insert_result = supabase.table("me_time_suggestions").insert({
        "user_id": user_data["user_id"],
        "mood_input": payload.mood_input,
        "activities": enriched_activities,
    }).execute()
    suggestion_id = insert_result.data[0]["id"] if insert_result.data else None

    return {
        "suggestion_id": suggestion_id,
        "mood_response": mood_response,
        "activities": enriched_activities,
    }


@router.post("/add-to-calendar")
async def add_to_calendar(request: Request, payload: AddToCalendarPayload):
    user_data = get_current_user(request)
    supabase = get_supabase()

    # Kullanıcının token'ını çek
    user_result = supabase.table("users").select("*").eq("id", user_data["user_id"]).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    db_user = user_result.data[0]

    if not db_user.get("google_access_token"):
        raise HTTPException(status_code=400, detail="Takvime eklemek için Google hesabı bağlı olmalı.")
    credentials = credentials_from_token_data(db_user)
    credentials = refresh_if_expired(credentials)

    # Öneri kaydını çek
    suggestion_result = (
        supabase.table("me_time_suggestions")
        .select("activities")
        .eq("id", payload.suggestion_id)
        .execute()
    )
    if not suggestion_result.data:
        raise HTTPException(status_code=404, detail="Öneri bulunamadı.")

    activities = suggestion_result.data[0]["activities"]
    if payload.activity_index >= len(activities):
        raise HTTPException(status_code=400, detail="Geçersiz aktivite indeksi.")

    activity = activities[payload.activity_index]
    venues = activity.get("venues", [])
    venue = venues[payload.venue_index] if payload.venue_index < len(venues) else None

    duration_hours = activity.get("estimated_duration_hours", 2)
    title = activity["title"]
    description_parts = [activity.get("description", "")]
    if venue:
        description_parts.append(f"Mekan: {venue.get('name', '')} — {venue.get('address', '')}")
        if venue.get("maps_url"):
            description_parts.append(f"Harita: {venue['maps_url']}")
    travel = activity.get("travel")
    if travel:
        description_parts.append(f"Tahmini yolculuk: {travel.get('label', '')}")

    # Takvime ekle
    from services.google.calendar import create_event
    from datetime import datetime, timedelta

    start_dt = datetime.fromisoformat(f"{payload.date}T{payload.start_time}:00")
    end_dt = start_dt + timedelta(hours=duration_hours)

    event_id = create_event(
        credentials=credentials,
        title=f"Me Time: {title}",
        description="\n".join(description_parts),
        start_dt=start_dt,
        end_dt=end_dt,
        location=venue.get("address") if venue else "",
    )

    # Öneriyi güncelle
    supabase.table("me_time_suggestions").update({
        "selected_activity_id": str(payload.activity_index),
        "calendar_event_id": event_id,
    }).eq("id", payload.suggestion_id).execute()

    # Token yenilendiyse kaydet
    new_token = token_data_from_credentials(credentials)
    supabase.table("users").update({
        "google_access_token": new_token["access_token"],
        "token_expiry": new_token["token_expiry"],
    }).eq("id", user_data["user_id"]).execute()

    return {"ok": True, "event_id": event_id}
