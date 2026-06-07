import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os

# Test ortamı için minimal env vars
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-secret")
os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-maps-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service-key")
os.environ.setdefault("SECRET_KEY", "test-secret-key-64-chars-long-padding-padding-padding-padding-1234")
os.environ.setdefault("CRON_SECRET", "test-cron-secret")


@pytest.fixture
def client():
    # Supabase ve Google clientları mock'la, gerçek bağlantı olmadan test et
    with patch("supabase.create_client") as mock_supabase:
        mock_supabase.return_value = MagicMock()
        from main import app
        with TestClient(app) as c:
            yield c
