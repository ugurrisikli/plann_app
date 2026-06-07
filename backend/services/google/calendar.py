from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from datetime import datetime, timedelta, timezone


def get_service(credentials: Credentials):
    return build("calendar", "v3", credentials=credentials)


def fetch_week_events(credentials: Credentials, week_start: datetime) -> list[dict]:
    service = get_service(credentials)
    week_end = week_start + timedelta(days=7)

    # Google Calendar API RFC 3339 formatı ister (Z veya +00:00 gerekli)
    def to_rfc3339(dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat().replace("+00:00", "Z")

    result = service.events().list(
        calendarId="primary",
        timeMin=to_rfc3339(week_start),
        timeMax=to_rfc3339(week_end),
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    return [_parse_event(e) for e in result.get("items", [])]


def get_free_slots(
    credentials: Credentials,
    week_start: datetime,
    work_start_hour: int = 9,
    work_end_hour: int = 20,
) -> list[dict]:
    existing = fetch_week_events(credentials, week_start)

    slots = []
    for day_offset in range(7):
        day = week_start + timedelta(days=day_offset)
        day_events = [
            e for e in existing
            if e["start_dt"] and e["start_dt"].date() == day.date()
        ]
        day_slots = _find_free_slots(
            day, day_events, work_start_hour, work_end_hour
        )
        slots.extend(day_slots)

    return slots


def create_event(
    credentials: Credentials,
    title: str,
    start_dt: datetime,
    end_dt: datetime,
    description: str = "",
    location: str = "",
) -> str:
    service = get_service(credentials)
    body = {
        "summary": title,
        "description": description,
        "location": location,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "Europe/Istanbul"},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": "Europe/Istanbul"},
    }
    event = service.events().insert(calendarId="primary", body=body).execute()
    return event["id"]


def delete_event(credentials: Credentials, event_id: str) -> None:
    service = get_service(credentials)
    service.events().delete(calendarId="primary", eventId=event_id).execute()


def _parse_event(event: dict) -> dict:
    start = event.get("start", {})
    end = event.get("end", {})

    start_str = start.get("dateTime") or start.get("date", "")
    end_str = end.get("dateTime") or end.get("date", "")

    def parse_dt(s: str):
        if not s:
            return None
        try:
            return datetime.fromisoformat(s)
        except ValueError:
            return None

    return {
        "id": event.get("id"),
        "title": event.get("summary", "(Başlıksız)"),
        "start": start_str,
        "end": end_str,
        "start_dt": parse_dt(start_str),
        "end_dt": parse_dt(end_str),
        "location": event.get("location", ""),
        "description": event.get("description", ""),
        "all_day": "date" in start,
    }


def _find_free_slots(
    day: datetime,
    events: list[dict],
    work_start: int,
    work_end: int,
) -> list[dict]:
    slots = []
    # Timezone bilgisini çıkar — karşılaştırmalar naive datetime üzerinden yapılır
    day_naive = day.replace(tzinfo=None)
    day_start = day_naive.replace(hour=work_start, minute=0, second=0, microsecond=0)
    day_end = day_naive.replace(hour=work_end, minute=0, second=0, microsecond=0)

    def to_naive(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        return dt.replace(tzinfo=None) if dt.tzinfo else dt

    timed = sorted(
        [e for e in events if e["start_dt"] and not e["all_day"]],
        key=lambda e: to_naive(e["start_dt"]) or day_start,
    )

    cursor = day_start
    for event in timed:
        ev_start = to_naive(event["start_dt"])
        ev_end = to_naive(event.get("end_dt"))

        if ev_start and ev_start > cursor:
            duration_min = int((ev_start - cursor).total_seconds() / 60)
            if duration_min >= 30:
                slots.append({
                    "start": cursor.isoformat(),
                    "end": ev_start.isoformat(),
                    "duration_min": duration_min,
                })
        if ev_end and ev_end > cursor:
            cursor = ev_end

    if cursor < day_end:
        duration_min = int((day_end - cursor).total_seconds() / 60)
        if duration_min >= 30:
            slots.append({
                "start": cursor.isoformat(),
                "end": day_end.isoformat(),
                "duration_min": duration_min,
            })

    return slots
