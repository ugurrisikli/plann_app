from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from passlib.context import CryptContext
from services.google.auth import get_flow, token_data_from_credentials
from core.config import get_settings
from supabase import create_client
import httpx
import jwt
import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _is_production() -> bool:
    url = get_settings().frontend_url
    return not url.startswith("http://localhost")


class SignupPayload(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginPayload(BaseModel):
    email: str
    password: str


def get_supabase():
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_key)


@router.get("/google")
async def google_login():
    flow = get_flow()
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return RedirectResponse(auth_url)


@router.get("/callback")
async def google_callback(request: Request, code: str, state: str = ""):
    import traceback
    settings = get_settings()
    try:
        flow = get_flow()
        flow.fetch_token(code=code)
        credentials = flow.credentials

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {credentials.token}"},
            )
        userinfo = resp.json()
        email = userinfo.get("email")
        if not email:
            raise ValueError(f"Google userinfo'da email yok: {userinfo}")
        name = userinfo.get("name", "")

        token_data = token_data_from_credentials(credentials)
        supabase = get_supabase()

        existing = supabase.table("users").select("id").eq("email", email).execute()
        if existing.data:
            user_id = existing.data[0]["id"]
            supabase.table("users").update({
                "google_access_token": token_data["access_token"],
                "google_refresh_token": token_data["refresh_token"],
                "token_expiry": token_data["token_expiry"],
                "auth_provider": "google",
            }).eq("id", user_id).execute()
        else:
            result = supabase.table("users").insert({
                "email": email,
                "name": name,
                "auth_provider": "google",
                "google_access_token": token_data["access_token"],
                "google_refresh_token": token_data["refresh_token"],
                "token_expiry": token_data["token_expiry"],
            }).execute()
            user_id = result.data[0]["id"]

        session_token = jwt.encode(
            {
                "user_id": user_id,
                "email": email,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30),
            },
            settings.secret_key,
            algorithm="HS256",
        )

        response = RedirectResponse(f"{settings.frontend_url}/dashboard")
        response.set_cookie(
            "session",
            session_token,
            httponly=True,
            secure=_is_production(),
            samesite="lax",
            max_age=30 * 24 * 3600,
        )
        return response

    except Exception as exc:
        logger = __import__("logging").getLogger(__name__)
        logger.exception("Google OAuth callback hatası: %s", exc)
        err = str(exc)[:200]
        import urllib.parse
        return RedirectResponse(f"{settings.frontend_url}/?error={urllib.parse.quote(err)}")


@router.post("/logout")
async def logout():
    response = RedirectResponse("/")
    response.delete_cookie("session")
    return response


# ── Email / Şifre Auth ────────────────────────────────────────────────────────

def _make_session_response(user_id: str, email: str, settings) -> JSONResponse:
    token = jwt.encode(
        {
            "user_id": user_id,
            "email": email,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30),
        },
        settings.secret_key,
        algorithm="HS256",
    )
    resp = JSONResponse({"ok": True, "email": email})
    resp.set_cookie(
        "session",
        token,
        httponly=True,
        secure=_is_production(),
        samesite="lax",
        max_age=30 * 24 * 3600,
    )
    return resp


@router.post("/signup")
async def signup(payload: SignupPayload):
    settings = get_settings()
    supabase = get_supabase()

    existing = supabase.table("users").select("id, auth_provider").eq("email", payload.email).execute()
    if existing.data:
        provider = existing.data[0].get("auth_provider", "")
        if provider == "google":
            raise HTTPException(status_code=409, detail="Bu e-posta Google ile kayıtlı. 'Google ile Giriş' butonunu kullan.")
        raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı.")

    hashed = pwd_context.hash(payload.password)
    insert = supabase.table("users").insert({
        "email": payload.email,
        "name": payload.name or payload.email.split("@")[0],
        "auth_provider": "email",
        "password_hash": hashed,
    }).execute()
    user_id = insert.data[0]["id"]

    return _make_session_response(user_id, payload.email, settings)


@router.post("/login")
async def login(payload: LoginPayload):
    settings = get_settings()
    supabase = get_supabase()

    row = supabase.table("users").select("id, auth_provider, password_hash").eq("email", payload.email).execute()
    if not row.data:
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")

    user = row.data[0]

    if user.get("auth_provider") == "google":
        raise HTTPException(status_code=401, detail="Bu hesap Google ile kayıtlı. Sayfadaki 'Google ile Giriş' butonunu kullan.")

    stored_hash = user.get("password_hash")
    if not stored_hash:
        raise HTTPException(status_code=401, detail="Bu hesap için şifre belirlenmemiş. Google ile giriş yapabilir veya yeni bir hesap oluşturabilirsin.")
    if not pwd_context.verify(payload.password, stored_hash):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")

    return _make_session_response(user["id"], payload.email, settings)
