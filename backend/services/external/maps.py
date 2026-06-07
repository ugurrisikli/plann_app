import httpx
from core.config import get_settings

PLACES_URL = "https://places.googleapis.com/v1/places:searchNearby"
TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"


async def nearby_places(
    lat: float,
    lng: float,
    activity_type: str,
    radius_m: int = 5000,
    max_results: int = 10,
) -> list[dict]:
    """Google Maps Places API (v1) ile yakın mekan ara."""
    api_key = get_settings().google_maps_api_key

    # activity_type → Google place type eşlemesi
    type_map = {
        "kafe": "cafe",
        "restoran": "restaurant",
        "park": "park",
        "müze": "museum",
        "spor salonu": "gym",
        "sinema": "movie_theater",
        "alışveriş": "shopping_mall",
        "kütüphane": "library",
        "sanat galerisi": "art_gallery",
        "spa": "spa",
    }
    place_type = type_map.get(activity_type.lower(), "point_of_interest")

    body = {
        "includedTypes": [place_type],
        "maxResultCount": max_results,
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": radius_m,
            }
        },
        "languageCode": "tr",
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.googleMapsUri,places.photos",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(PLACES_URL, json=body, headers=headers)
        resp.raise_for_status()

    return [_parse_place(p) for p in resp.json().get("places", [])]


async def text_search_places(
    query: str,
    location_bias: str = "İstanbul",
    language_code: str = "tr",
    max_results: int = 8,
) -> list[dict]:
    api_key = get_settings().google_maps_api_key

    body = {
        "textQuery": query if "in " in query else f"{query} {location_bias}",
        "languageCode": language_code,
        "maxResultCount": max_results,
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.googleMapsUri",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(TEXT_SEARCH_URL, json=body, headers=headers)
        resp.raise_for_status()

    return [_parse_place(p) for p in resp.json().get("places", [])]


def _parse_place(place: dict) -> dict:
    return {
        "name": place.get("displayName", {}).get("text", ""),
        "address": place.get("formattedAddress", ""),
        "rating": place.get("rating"),
        "maps_url": place.get("googleMapsUri", ""),
        "source": "google_maps",
    }
