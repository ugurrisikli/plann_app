def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_unknown_route_returns_404(client):
    resp = client.get("/api/nonexistent")
    assert resp.status_code == 404


def test_cron_without_secret_returns_401(client):
    resp = client.post("/api/cron/weekly-plan")
    # Header eksik → 422 (FastAPI validation) veya 401
    assert resp.status_code in (401, 422)


def test_cron_with_wrong_secret_returns_401(client):
    resp = client.post(
        "/api/cron/weekly-plan",
        headers={"X-Cron-Secret": "yanlis-secret"},
    )
    assert resp.status_code == 401
