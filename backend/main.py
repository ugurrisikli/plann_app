import os
# requests_oauthlib scope değişikliklerine izin ver (Google scope sırasını değiştirebilir)
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.config import get_settings
from api.auth import router as auth_router
from api.chat import router as chat_router
from api.me_time import router as me_time_router
from api.plan import router as plan_router
from api.cron import router as cron_router
from api.settings import router as settings_router
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(title="Planlama App API", version="0.1.0")

# allow_origin_regex + allow_credentials Starlette'de güvenilir çalışmıyor.
# Explicit liste kullan: trailing slash temizle + sabit production URL ekle.
_frontend = settings.frontend_url.rstrip("/")
_allowed_origins = list({
    _frontend,
    "https://plann-app-frontend.vercel.app",
} | {f"http://localhost:{p}" for p in range(3000, 3010)})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(me_time_router)
app.include_router(plan_router)
app.include_router(cron_router)
app.include_router(settings_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Beklenmeyen hata: %s %s — %s", request.method, request.url, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Sunucu hatası oluştu. Lütfen tekrar dene."},
    )


@app.on_event("startup")
async def on_startup():
    s = get_settings()
    logger.info("=== STARTUP ===")
    logger.info("frontend_url: %s", s.frontend_url)
    logger.info("effective_redirect_uri: %s", s.effective_redirect_uri)
    logger.info("railway_public_domain: %s", s.railway_public_domain or "(not set)")


@app.get("/health")
async def health():
    s = get_settings()
    return {
        "status": "ok",
        "redirect_uri": s.effective_redirect_uri,
        "frontend_url": s.frontend_url,
    }
