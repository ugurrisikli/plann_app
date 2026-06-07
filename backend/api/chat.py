from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from core.middleware import get_current_user
from core.config import get_settings
from services.google.auth import credentials_from_token_data, refresh_if_expired
from agents.ceo_agent import stream_response
from supabase import create_client

router = APIRouter(prefix="/api/chat", tags=["chat"])


class HistoryItem(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[list[HistoryItem]] = []


def get_supabase():
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_key)


@router.post("/stream")
async def chat_stream(body: ChatRequest, request: Request):
    current_user = get_current_user(request)
    user_id = current_user["user_id"]

    supabase = get_supabase()
    user_row = supabase.table("users").select("*").eq("id", user_id).single().execute()
    if not user_row.data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    user = user_row.data
    token_data = {
        "access_token": user.get("google_access_token"),
        "refresh_token": user.get("google_refresh_token"),
    }
    credentials = credentials_from_token_data(token_data)
    if token_data["access_token"]:
        credentials = refresh_if_expired(credentials)
        # Token yenilendiyse kaydet
        if credentials.token != user.get("google_access_token"):
            supabase.table("users").update({
                "google_access_token": credentials.token,
            }).eq("id", user_id).execute()

    user_data = {
        "user_id": user_id,
        "sheets_file_id": user.get("sheets_file_id"),
        "home_address": user.get("home_address"),
        "work_address": user.get("work_address"),
        "preferences": {
            "work_start": 9,
            "work_end": 20,
        },
    }

    history = [{"role": h.role, "content": h.content} for h in (body.history or [])]

    async def event_generator():
        async for chunk in stream_response(body.message, user_data, credentials, history):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
