import httpx
from core.config import get_settings

BASE_URL = "https://app.ticketmaster.com/discovery/v2"

CATEGORY_MAP = {
    "müzik": "Music",
    "konser": "Music",
    "spor": "Sports",
    "sanat": "Arts & Theatre",
    "sergi": "Arts & Theatre",
    "tiyatro": "Arts & Theatre",
    "eğlence": "Miscellaneous",
}


async def search_events(
    city: str,
    country_code: str = "TR",
    category: str | None = None,
    radius_km: int = 30,
    size: int = 10,
) -> list[dict]:
    api_key = get_settings().ticketmaster_api_key
    if not api_key:
        return []

    segment_name = CATEGORY_MAP.get(category.lower(), None) if category else None

    params = {
        "apikey": api_key,
        "city": city,
        "countryCode": country_code,
        "radius": radius_km,
        "unit": "km",
        "size": size,
        "locale": "*",
        "sort": "date,asc",
    }
    if segment_name:
        params["segmentName"] = segment_name

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{BASE_URL}/events.json", params=params)
        resp.raise_for_status()

    data = resp.json()
    events = data.get("_embedded", {}).get("events", [])
    return [_parse_event(e) for e in events]


def _parse_event(event: dict) -> dict:
    dates = event.get("dates", {}).get("start", {})
    venue = {}
    venues = event.get("_embedded", {}).get("venues", [])
    if venues:
        venue = venues[0]

    price_ranges = event.get("priceRanges", [])
    price_str = ""
    if price_ranges:
        pr = price_ranges[0]
        price_str = f"{pr.get('min', '')} - {pr.get('max', '')} {pr.get('currency', 'TRY')}"

    return {
        "title": event.get("name", ""),
        "date": dates.get("localDate", ""),
        "time": dates.get("localTime", ""),
        "venue_name": venue.get("name", ""),
        "venue_address": venue.get("address", {}).get("line1", ""),
        "city": venue.get("city", {}).get("name", ""),
        "url": event.get("url", ""),
        "image_url": _best_image(event.get("images", [])),
        "price_range": price_str,
        "category": event.get("classifications", [{}])[0].get("segment", {}).get("name", ""),
        "source": "ticketmaster",
    }


def _best_image(images: list) -> str:
    for img in images:
        if img.get("ratio") == "16_9" and img.get("width", 0) >= 640:
            return img["url"]
    return images[0]["url"] if images else ""
