from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from core.config import get_settings
import json

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "openid",
    "email",
    "profile",
]


def get_flow(redirect_uri: str | None = None) -> Flow:
    settings = get_settings()
    # Önce env'deki sabit URI'yi kullan, yoksa parametre, yoksa default
    uri = redirect_uri or settings.google_redirect_uri
    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [uri],
        }
    }
    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = uri
    return flow


def credentials_from_token_data(token_data: dict) -> Credentials:
    settings = get_settings()
    # DB satırı (google_access_token) veya chat.py dict'i (access_token) — ikisini de destekle
    access = token_data.get("access_token") or token_data.get("google_access_token")
    refresh = token_data.get("refresh_token") or token_data.get("google_refresh_token")
    return Credentials(
        token=access,
        refresh_token=refresh,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=SCOPES,
    )


def refresh_if_expired(credentials: Credentials) -> Credentials:
    if not credentials.valid and credentials.refresh_token:
        credentials.refresh(Request())
    return credentials


def token_data_from_credentials(credentials: Credentials) -> dict:
    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
    }
