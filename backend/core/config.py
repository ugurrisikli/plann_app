from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    anthropic_api_key: str
    google_client_id: str
    google_client_secret: str
    google_maps_api_key: str
    google_ai_studio_api_key: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/callback"
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


@lru_cache
def get_settings() -> Settings:
    return Settings()
