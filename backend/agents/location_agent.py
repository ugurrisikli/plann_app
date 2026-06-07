import asyncio
import time
from core.orchestrator import AgentReport
from services.external.maps import text_search_places
from services.external.ticketmaster import search_events
from agents.traffic_agent import estimate_for_location


async def run(
    activities: list[dict],
    user_location: str,
    city: str = "Istanbul",
    radius_km: int = 15,
) -> AgentReport:
    start = time.monotonic()

    enriched = await asyncio.gather(
        *[_enrich_activity(act, user_location, city, radius_km) for act in activities],
        return_exceptions=True,
    )

    result_activities = []
    errors = []
    for activity, enrichment in zip(activities, enriched):
        if isinstance(enrichment, Exception):
            errors.append(f"{activity['title']}: {enrichment}")
            result_activities.append({**activity, "venues": [], "events": [], "travel": None})
        else:
            result_activities.append({**activity, **enrichment})

    duration_ms = int((time.monotonic() - start) * 1000)
    return AgentReport(
        agent_name="location_agent",
        status="partial" if errors else "success",
        result={"activities": result_activities},
        confidence=0.8,
        duration_ms=duration_ms,
        errors=errors,
        suggestions=[],
    )


async def _enrich_activity(
    activity: dict,
    user_location: str,
    city: str,
    radius_km: int = 15,
) -> dict:
    search_query = activity.get("search_query", activity["title"])
    ticketmaster_cat = activity.get("ticketmaster_category")

    tasks = [_fetch_places(search_query, city, radius_km)]
    if ticketmaster_cat and ticketmaster_cat != "null":
        tasks.append(_fetch_ticketmaster(city, ticketmaster_cat))
    else:
        tasks.append(_noop())

    results = await asyncio.gather(*tasks, return_exceptions=True)
    venues = results[0] if not isinstance(results[0], Exception) else []
    events = results[1] if not isinstance(results[1], Exception) else []

    travel = None
    if user_location and venues:
        venue_addr = venues[0].get("address") or venues[0].get("name", "")
        if venue_addr:
            try:
                travel = await estimate_for_location(user_location, venue_addr)
            except Exception:
                travel = None

    return {
        "venues": venues[:4],
        "events": events[:6],
        "travel": travel,
    }


async def _fetch_places(query: str, city: str, radius_km: int = 15) -> list[dict]:
    try:
        # radius_km büyükse max_results artır
        max_results = min(8 + (radius_km // 5), 20)
        return await text_search_places(
            query=f"{query} in {city}",
            language_code="tr",
            max_results=max_results,
        )
    except Exception:
        return []


async def _fetch_ticketmaster(city: str, category: str) -> list[dict]:
    try:
        return await search_events(city=city, country_code="TR", category=category, radius_km=50)
    except Exception:
        return []


async def _noop() -> list:
    return []
