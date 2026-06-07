from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    anthropic_api_key: str
    google_client_id: str
    google_client_secret: str
    google_maps_api_key: str
    google_ai_studio_api_key: str = ""
    # Boş bırakılırsa RAILWAY_PUBLIC_DOMAIN'den otomatik türetilir
    google_redirect_uri: str = ""
    # Railway otomatik set eder: plann-app-backend-production.up.railway.app
    railway_public_domain: str = ""
    supabase_url: str
    supabase_service_key: str
    ticketmaster_api_key: str = ""
    apify_api_token: str = ""
    fal_api_key: str = ""
    frontend_url: str = "http://localhost:3000"
    secret_key: str
    cron_secret: str = ""
    dev_google_access_token: str = ""
    dev_google_refresh_token: str = ""

    @property
    def effective_redirect_uri(self) -> str:
        if self.google_redirect_uri:
            return self.google_redirect_uri
        if self.railway_public_domain:
            return f"https://{self.railway_public_domain}/api/auth/callback"
        return "http://localhost:8000/api/auth/callback"


@lru_cache
def get_settings() -> Settings:
    return Settings()
