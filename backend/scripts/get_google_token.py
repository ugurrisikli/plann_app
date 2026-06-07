"""
Google OAuth token üretici — tek seferlik kurulum scripti.

Kullanım:
  cd backend
  source venv/bin/activate
  python scripts/get_google_token.py

Gereksinim: Google Cloud Console → Credentials → OAuth 2.0 Client (Web Application) →
  Authorized redirect URIs → http://localhost:8090/ ekli olmalı.
"""
import os, sys, http.server, urllib.parse, webbrowser
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# Google daha geniş scope döndürdüğünde uyarıyı hata sayma
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

for key in ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]:
    if not os.environ.get(key):
        print(f"HATA: .env dosyasında {key} eksik.")
        sys.exit(1)

from google_auth_oauthlib.flow import Flow

REDIRECT_URI = "http://localhost:8090/"
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

# Web Application tipi config (Desktop değil)
client_config = {
    "web": {
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
        "redirect_uris": [REDIRECT_URI],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}

flow = Flow.from_client_config(client_config, SCOPES, redirect_uri=REDIRECT_URI)
auth_url, _ = flow.authorization_url(
    access_type="offline",
    prompt="consent",
    include_granted_scopes="true",
)

# Port 8090'da callback yakala
auth_code: list[str | None] = [None]

class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if "code" in params:
            auth_code[0] = params["code"][0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(
            b"<html><body style='font-family:sans-serif;text-align:center;padding:60px'>"
            b"<h2>\xe2\x9c\x85 Tamam! Bu sekmeyi kapatabilirsin.</h2></body></html>"
        )

    def log_message(self, *args): pass

server = http.server.HTTPServer(("localhost", 8090), CallbackHandler)
server.timeout = 180

print("Tarayıcı açılıyor — ugurr.isikli@gmail.com ile giriş yap ve izin ver...")
webbrowser.open(auth_url)
print("(Tarayıcı açılmazsa şu URL'yi yapıştır:)")
print(auth_url[:80] + "...")

server.handle_request()

if not auth_code[0]:
    print("HATA: İzin alınamadı.")
    sys.exit(1)

flow.fetch_token(code=auth_code[0])
creds = flow.credentials

print("\n✅ Token alındı!")

# .env dosyasına yaz
import re
env_path = ROOT / ".env"
env_text = env_path.read_text()

def set_env_var(text: str, key: str, value: str) -> str:
    pattern = rf"^{key}=.*$"
    line = f"{key}={value}"
    if re.search(pattern, text, re.MULTILINE):
        return re.sub(pattern, line, text, flags=re.MULTILINE)
    return text.rstrip() + f"\n{line}\n"

env_text = set_env_var(env_text, "DEV_GOOGLE_ACCESS_TOKEN", creds.token or "")
env_text = set_env_var(env_text, "DEV_GOOGLE_REFRESH_TOKEN", creds.refresh_token or "")
env_path.write_text(env_text)
print("✅ .env dosyasına yazıldı.")

# Supabase'e kaydet
import httpx
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
DEV_EMAIL    = "ugurr.isikli@gmail.com"

expiry_iso = creds.expiry.isoformat() if creds.expiry else None

resp = httpx.get(
    f"{SUPABASE_URL}/rest/v1/users?email=eq.{DEV_EMAIL}&select=id",
    headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
)
rows = resp.json()

if not rows:
    print(f"\n⚠️  Supabase'de {DEV_EMAIL} bulunamadı.")
    print("   Önce uygulamaya (localhost:3000) herhangi bir e-posta/şifreyle giriş yap,")
    print("   sonra bu scripti tekrar çalıştır.")
    sys.exit(0)

user_id = rows[0]["id"]
r = httpx.patch(
    f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}",
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    },
    json={
        "google_access_token":  creds.token,
        "google_refresh_token": creds.refresh_token,
        "token_expiry": expiry_iso,
    },
)
if r.status_code in (200, 204):
    print(f"✅ Supabase → {DEV_EMAIL} Google token'ları güncellendi.")
    print("\n🎉 Plan Pete artık Google hesabına erişebilir!")
else:
    print(f"⚠️  Supabase hatası: {r.status_code} — {r.text}")
