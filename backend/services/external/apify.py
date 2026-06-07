import httpx
from core.config import get_settings

BASE_URL = "https://api.apify.com/v2"

# Apify'daki hazır actor ID'leri
EVENTBRITE_ACTOR = "apify/eventbrite-scraper"


async def scrape_eventbrite(
    location: str,
    query: str = "",
    max_items: int = 15,
) -> list[dict]:
    """
    Apify üzerinden Eventbrite etkinliklerini çeker.
    Sonuçlar Supabase'de cache'lenir — her istekte çağrılmaz.
    """
    token = get_settings().apify_api_token
    if not token:
        return []

    input_data = {
        "locationName": location,
        "query": query,
        "maxItems": max_items,
        "startPage": 1,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        # Actor çalıştır
        run_resp = await client.post(
            f"{BASE_URL}/acts/{EVENTBRITE_ACTOR}/runs",
            params={"token": token},
            json=input_data,
        )
        run_resp.raise_for_status()
        run_id = run_resp.json()["data"]["id"]

        # Sonucu bekle (polling — Apify tipik olarak 30-60 sn sürer)
        for _ in range(24):  # max ~2 dk bekle
            import asyncio
            await asyncio.sleep(5)
            status_resp = await client.get(
                f"{BASE_URL}/acts/{EVENTBRITE_ACTOR}/runs/{run_id}",
                params={"token": token},
            )
            status = status_resp.json()["data"]["status"]
            if status == "SUCCEEDED":
                break
            if status in ("FAILED", "ABORTED", "TIMED-OUT"):
                return []

        # Dataset'i çek
        dataset_resp = await client.get(
            f"{BASE_URL}/acts/{EVENTBRITE_ACTOR}/runs/{run_id}/dataset/items",
            params={"token": token, "limit": max_items},
        )
        dataset_resp.raise_for_status()
        items = dataset_resp.json()

    return [_parse_eventbrite_item(item) for item in items]


def _parse_eventbrite_item(item: dict) -> dict:
    return {
        "title": item.get("name", ""),
        "date": item.get("startDate", ""),
        "time": item.get("startTime", ""),
        "venue_name": item.get("venueName", ""),
        "venue_address": item.get("venueAddress", ""),
        "city": item.get("city", ""),
        "url": item.get("url", ""),
        "image_url": item.get("imageUrl", ""),
        "price_range": item.get("price", "Ücretsiz"),
        "category": item.get("category", ""),
        "source": "eventbrite",
    }
