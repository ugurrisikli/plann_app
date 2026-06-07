import httpx
from core.config import get_settings
from datetime import datetime

DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"


async def get_travel_time(
    origin: str,
    destination: str,
    departure_time: datetime | None = None,
) -> dict:
    """
    İki adres arasındaki trafik dahil seyahat süresini döner.
    Hem haftalık plan hem Me Time mekan önerileri için kullanılır.
    """
    api_key = get_settings().google_maps_api_key

    params = {
        "origins": origin,
        "destinations": destination,
        "mode": "driving",
        "language": "tr",
        "key": api_key,
        "traffic_model": "best_guess",
        "departure_time": (
            int(departure_time.timestamp()) if departure_time else "now"
        ),
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(DISTANCE_MATRIX_URL, params=params)
        resp.raise_for_status()

    data = resp.json()

    try:
        element = data["rows"][0]["elements"][0]
        if element["status"] != "OK":
            return _error_result(origin, destination)

        duration_min = element["duration"]["value"] // 60
        duration_traffic_min = element.get("duration_in_traffic", {}).get("value", element["duration"]["value"]) // 60
        distance_km = round(element["distance"]["value"] / 1000, 1)

        traffic_delta = duration_traffic_min - duration_min
        if traffic_delta <= 2:
            traffic_level = "low"
        elif traffic_delta <= 10:
            traffic_level = "medium"
        else:
            traffic_level = "heavy"

        return {
            "origin": origin,
            "destination": destination,
            "duration_min": duration_min,
            "duration_traffic_min": duration_traffic_min,
            "distance_km": distance_km,
            "traffic_level": traffic_level,
            "traffic_label": {"low": "Akıcı", "medium": "Orta", "heavy": "Yoğun"}[traffic_level],
        }
    except (KeyError, IndexError):
        return _error_result(origin, destination)


async def batch_travel_times(legs: list[tuple[str, str]], departure_time: datetime | None = None) -> list[dict]:
    """Birden fazla güzergah için paralel trafik sorgulama."""
    import asyncio
    tasks = [get_travel_time(o, d, departure_time) for o, d in legs]
    return await asyncio.gather(*tasks)


async def geocode_address(address: str) -> dict | None:
    """Adres → (lat, lng) koordinatı."""
    api_key = get_settings().google_maps_api_key
    params = {"address": address, "key": api_key, "language": "tr"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(GEOCODING_URL, params=params)
        resp.raise_for_status()

    results = resp.json().get("results", [])
    if not results:
        return None

    location = results[0]["geometry"]["location"]
    return {"lat": location["lat"], "lng": location["lng"], "formatted": results[0]["formatted_address"]}


def _error_result(origin: str, destination: str) -> dict:
    return {
        "origin": origin,
        "destination": destination,
        "duration_min": None,
        "duration_traffic_min": None,
        "distance_km": None,
        "traffic_level": "unknown",
        "traffic_label": "Bilinmiyor",
    }
