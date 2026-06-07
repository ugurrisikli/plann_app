import time
from datetime import datetime
from core.orchestrator import AgentReport
from services.external.traffic import get_travel_time, batch_travel_times, geocode_address


async def run(
    legs: list[dict],
    departure_time: datetime | None = None,
) -> AgentReport:
    """
    legs: [{"from": "adres1", "to": "adres2", "label": "açıklama"}, ...]
    Her iki senaryo için kullanılır:
    - Haftalık planda konumlu görevler arası geçiş
    - Me Time'da ev → öneri mekanı mesafesi
    """
    t0 = time.monotonic()
    if not legs:
        return AgentReport(
            agent_name="traffic_agent",
            status="success",
            result={"legs": []},
            duration_ms=0,
        )

    try:
        pairs = [(leg["from"], leg["to"]) for leg in legs]
        results = await batch_travel_times(pairs, departure_time)

        enriched = []
        for leg, result in zip(legs, results):
            enriched.append({
                "label": leg.get("label", ""),
                **result,
                "recommendation": _make_recommendation(result),
            })

        return AgentReport(
            agent_name="traffic_agent",
            status="success",
            result={"legs": enriched},
            duration_ms=int((time.monotonic() - t0) * 1000),
        )

    except Exception as e:
        return AgentReport(
            agent_name="traffic_agent",
            status="failed",
            result={"legs": []},
            errors=[str(e)],
            duration_ms=int((time.monotonic() - t0) * 1000),
        )


async def estimate_for_location(
    home_address: str,
    venue_address: str,
    departure_time: datetime | None = None,
) -> dict:
    """Me Time mekan önerisi için tek seferlik trafik tahmini."""
    result = await get_travel_time(home_address, venue_address, departure_time)
    result["recommendation"] = _make_recommendation(result)
    return result


def _make_recommendation(result: dict) -> str:
    if result["duration_traffic_min"] is None:
        return "Süre hesaplanamadı."

    mins = result["duration_traffic_min"]
    level = result["traffic_level"]

    labels = {"low": "akıcı", "medium": "orta yoğunlukta", "heavy": "yoğun"}
    traffic_label = labels.get(level, "")

    if mins <= 15:
        return f"~{mins} dk — trafik {traffic_label}, yakın mesafe."
    elif mins <= 30:
        return f"~{mins} dk — trafik {traffic_label}."
    else:
        return f"~{mins} dk — trafik {traffic_label}, erken yola çık."
