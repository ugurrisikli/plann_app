import time
from datetime import datetime, timezone
from google.oauth2.credentials import Credentials
from core.orchestrator import AgentReport
from services.google.calendar import (
    fetch_week_events,
    get_free_slots,
    create_event,
    delete_event,
)


async def run(
    credentials: Credentials,
    week_start: datetime,
    work_start_hour: int = 9,
    work_end_hour: int = 20,
) -> AgentReport:
    t0 = time.monotonic()
    try:
        events = fetch_week_events(credentials, week_start)
        free_slots = get_free_slots(credentials, week_start, work_start_hour, work_end_hour)

        # Konumlu etkinlikleri işaretle (trafik hesabı için)
        located_events = [e for e in events if e.get("location")]

        return AgentReport(
            agent_name="calendar_agent",
            status="success",
            result={
                "existing_events": [_serialize(e) for e in events],
                "located_events": [_serialize(e) for e in located_events],
                "free_slots": free_slots,
                "total_events": len(events),
                "total_free_slots": len(free_slots),
            },
            duration_ms=int((time.monotonic() - t0) * 1000),
        )
    except Exception as e:
        return AgentReport(
            agent_name="calendar_agent",
            status="failed",
            result={"existing_events": [], "free_slots": []},
            errors=[str(e)],
            duration_ms=int((time.monotonic() - t0) * 1000),
        )


async def write_events(credentials: Credentials, tasks: list[dict]) -> AgentReport:
    """Onaylanan görevleri Google Calendar'a yazar."""
    t0 = time.monotonic()
    written = []
    errors = []

    for task in tasks:
        try:
            event_id = create_event(
                credentials,
                title=task["title"],
                start_dt=datetime.fromisoformat(task["start_time"]),
                end_dt=datetime.fromisoformat(task["end_time"]),
                description=task.get("description", ""),
                location=task.get("location", ""),
            )
            written.append({"task_id": task["id"], "event_id": event_id})
        except Exception as e:
            errors.append(f"{task['title']}: {e}")

    return AgentReport(
        agent_name="calendar_agent",
        status="success" if not errors else "partial",
        result={"written": written, "count": len(written)},
        errors=errors,
        duration_ms=int((time.monotonic() - t0) * 1000),
    )


def _serialize(event: dict) -> dict:
    e = dict(event)
    e.pop("start_dt", None)
    e.pop("end_dt", None)
    return e
