import json
import anthropic
from datetime import datetime, timezone, timedelta
from google.oauth2.credentials import Credentials
from core.config import get_settings
from core.orchestrator import run_parallel
import agents.gmail_agent as gmail_agent
import agents.sheets_agent as sheets_agent
import agents.calendar_agent as calendar_agent
import agents.traffic_agent as traffic_agent
import agents.planning_agent as planning_agent
import agents.me_time_agent as me_time_agent
import agents.location_agent as location_agent
import agents.drive_agent as drive_agent
from typing import AsyncIterator

SYSTEM_PROMPT = """Sen Plan Pete adlı kişisel yaşam asistanısın. Kullanıcının haftalık planını yapar, mekan önerir, Me Time aktiviteleri sunar.

Kişiliğin:
- Sıcak, doğal ve net konuşursun — ne fazla resmi ne çok samimi
- Her zaman Türkçe yanıt verirsin
- Belirsizlik varsa sor, tahmin etme
- Alt sistemlerden (takvim, mail, görevler, mekanlar) veri toplar ve sentezlersin
- Planlarında ve önerilerinde neden/gerekçe açıklarsın
- Kullanıcı "kararları sana bırakıyorum" derse onay beklemeden ilerlersin

Mekan verisi hakkında:
- Sistem sana GERÇEK Google Maps verisi sağlar — bu verileri kullan, uydurma
- Mekan adlarını, adreslerini ve puanlarını olduğu gibi aktar
- Maps linklerini kullanıcıya göster

Sınırların:
- Takvime hiçbir şey kullanıcı onaylamadan yazmaz
- Kişisel verileri asla üçüncü tarafla paylaşmazsın
- Sisteme veri sağlanmamışsa "bilgim yok" de, uydurma"""

INTENT_PROMPT = """Kullanıcının son mesajını ve konuşma geçmişini analiz et, niyeti belirle.

Kategoriler:
- weekly_plan: haftalık plan yapma, bu haftayı planla, görevler, hafta
- me_time: me time, aktivite, dinlenme, eğlence, hobi, öneri (mekan adı OLMADAN genel öneri)
- venue_search: belirli bir yer/semt/şehirde mekan ara (kafe, restoran, park, müze, bar vb.) — "Kadıköy'de kafe", "Moda'da akşam yemeği", "Beşiktaş spor salonu" gibi
- calendar_query: takvim sorgula, ne var, randevu, bu hafta ne var, etkinlik
- general_chat: diğer her şey (selamlama, teşekkür, genel soru, önceki konuya devam)

SADECE kategori adını döndür, başka hiçbir şey yazma."""


async def stream_response(
    user_message: str,
    user_data: dict,
    credentials: Credentials,
    history: list[dict] | None = None,
) -> AsyncIterator[str]:
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    history = history or []

    # 1. Niyet tespiti — history + mevcut mesajı birlikte analiz et
    history_summary = ""
    if history:
        last_pairs = history[-4:]  # son 4 tur yeterli
        history_summary = "\n".join(
            f"{'Kullanıcı' if h['role']=='user' else 'Plan Pete'}: {h['content'][:200]}"
            for h in last_pairs
        )

    intent_input = (
        f"Konuşma geçmişi:\n{history_summary}\n\n" if history_summary else ""
    ) + f"Son mesaj: {user_message}"

    intent_resp = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=20,
        messages=[{"role": "user", "content": f"{INTENT_PROMPT}\n\n{intent_input}"}],
    )
    intent = intent_resp.content[0].text.strip().lower().split()[0]

    # 2. Niyete göre bağlam topla
    context_block = ""
    if intent == "weekly_plan":
        yield f"data: {_sse('status', 'Takvim, mail ve görevler okunuyor...')}\n\n"
        context_block = await _gather_weekly_plan_context(user_data, credentials)
    elif intent == "me_time":
        yield f"data: {_sse('status', 'Me Time önerileri hazırlanıyor...')}\n\n"
        context_block = await _gather_me_time_context(user_data, user_message)
    elif intent == "venue_search":
        yield f"data: {_sse('status', 'Mekanlar aranıyor...')}\n\n"
        context_block = await _gather_venue_context(user_message, user_data)
    elif intent == "calendar_query":
        yield f"data: {_sse('status', 'Takvim okunuyor...')}\n\n"
        context_block = await _gather_calendar_context(credentials)

    # 3. Mesaj dizisini oluştur (multi-turn history)
    messages: list[dict] = []
    for h in history[-12:]:
        messages.append({"role": h["role"], "content": h["content"]})

    # Son kullanıcı mesajı — varsa bağlam bloğu eklenir
    final_user_content = user_message
    if context_block:
        final_user_content = (
            f"{user_message}\n\n=== SİSTEM VERİLERİ ===\n{context_block}"
        )

    # Claude API alternating messages kuralı: son eleman user olmalı
    # History zaten user→assistant sırasında geldiği için güvenli
    messages.append({"role": "user", "content": final_user_content})

    # 4. CEO yanıtını stream et
    async with client.messages.stream(
        model="claude-opus-4-8",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield f"data: {_sse('token', text)}\n\n"

    yield f"data: {_sse('done', '')}\n\n"


async def _gather_weekly_plan_context(user_data: dict, credentials: Credentials) -> str:
    week_start = _current_week_monday()
    sheets_file_id = user_data.get("sheets_file_id", "")

    parallel_tasks = [
        (gmail_agent.run, {"credentials": credentials}),
        (calendar_agent.run, {"credentials": credentials, "week_start": week_start}),
        (drive_agent.run, {"credentials": credentials, "read_content": False}),
    ]
    if sheets_file_id:
        parallel_tasks.append(
            (sheets_agent.run, {"credentials": credentials, "spreadsheet_id": sheets_file_id})
        )

    reports = await run_parallel(parallel_tasks)
    gmail_report = reports[0]
    calendar_report = reports[1]
    drive_report = reports[2]
    sheets_report = reports[3] if sheets_file_id else None

    gmail_tasks = gmail_report.result.get("tasks", []) if gmail_report.status != "failed" else []
    sheets_tasks = sheets_report.result.get("tasks", []) if sheets_report and sheets_report.status != "failed" else []
    free_slots = calendar_report.result.get("free_slots", []) if calendar_report.status != "failed" else []
    located_events = calendar_report.result.get("located_events", [])
    existing_events = calendar_report.result.get("existing_events", [])
    drive_context = drive_report.result.get("context", "") if drive_report.status != "failed" else ""
    drive_files = drive_report.result.get("relevant_files", []) if drive_report.status != "failed" else []

    traffic_legs = []
    if located_events and user_data.get("home_address"):
        legs = [
            {"from": user_data["home_address"], "to": e["location"], "label": e["title"]}
            for e in located_events if e.get("location")
        ]
        if legs:
            tr = await traffic_agent.run(legs)
            traffic_legs = tr.result.get("legs", [])

    plan_report = await planning_agent.run(
        gmail_tasks=gmail_tasks,
        sheets_tasks=sheets_tasks,
        free_slots=free_slots,
        traffic_legs=traffic_legs,
        week_start=week_start,
        user_preferences=user_data.get("preferences", {}),
        drive_context=drive_context,
    )

    errors = []
    if gmail_report.status == "failed":
        errors.append("Gmail'e ulaşılamadı")
    if calendar_report.status == "failed":
        errors.append("Takvim okunamadı")
    if sheets_report and sheets_report.status == "failed":
        errors.append("Yapılacaklar dosyası okunamadı")
    if drive_report.status == "failed":
        errors.append("Drive dosyalarına ulaşılamadı")

    parts = []
    if errors:
        parts.append(f"UYARILAR: {', '.join(errors)}")

    # Mevcut takvim etkinlikleri
    if existing_events:
        parts.append(f"\nBu hafta takvimdeki {len(existing_events)} etkinlik:")
        for e in existing_events:
            parts.append(f"  - {e['start'][:10]} {e['start'][11:16] if len(e['start']) > 10 else ''}: {e['title']}")

    # Gmail görevleri
    if gmail_tasks:
        parts.append(f"\nGmail'den {len(gmail_tasks)} eylem maddesi:")
        for t in gmail_tasks[:5]:
            parts.append(f"  - {t.get('title', '')} (öncelik: {t.get('priority', 'medium')})")

    # Sheets görevleri
    if sheets_tasks:
        parts.append(f"\nYapılacaklar listesinden {len(sheets_tasks)} görev:")
        for t in sheets_tasks[:5]:
            parts.append(f"  - {t.get('title', '')}")

    # Drive dosyaları
    if drive_files:
        parts.append(f"\nDrive'dan {len(drive_files)} ilgili dosya:")
        for f in drive_files[:4]:
            parts.append(f"  - {f.get('name', '')} ({f.get('reason', '')})")

    # Müsait slotlar
    if free_slots:
        parts.append(f"\nBu hafta {len(free_slots)} müsait zaman dilimi var.")

    # Plan önerisi
    plan = plan_report.result.get("plan", [])
    summary = plan_report.result.get("summary", "")
    warnings = plan_report.result.get("warnings", [])

    if summary:
        parts.append(f"\nPlanlama özeti: {summary}")
    if warnings:
        parts.append("Uyarılar: " + " | ".join(warnings))
    if plan:
        parts.append("\nÖnerilen görev planı:")
        for task in plan:
            traffic_note = f" (yolda ~{task['travel_time_min']} dk)" if task.get("travel_time_min") else ""
            parts.append(
                f"  - {task['date']} {task['start_time']}-{task['end_time']}: "
                f"{task['title']}{traffic_note}"
                + (f"\n    Gerekçe: {task.get('reasoning', '')}" if task.get("reasoning") else "")
            )
        parts.append(
            "\n[Planı düzenlemek ve onaylamak için → /plan/weekly sayfasına git. "
            "Görevleri sürükle-bırakla yeniden düzenleyebilir ve tek tek onaylayabilirsin.]"
        )

    return "\n".join(parts)


async def _gather_me_time_context(user_data: dict, mood_input: str) -> str:
    """Me Time Agent + Location Agent çağırır, sonuçları metin olarak döner."""
    from core.config import get_settings
    from supabase import create_client

    s = get_settings()
    supabase = create_client(s.supabase_url, s.supabase_service_key)

    # Profili çek
    profile_result = (
        supabase.table("me_time_profiles")
        .select("*")
        .eq("user_id", user_data["user_id"])
        .execute()
    )
    profile = profile_result.data[0] if profile_result.data else {}

    city = profile.get("city", "İstanbul")
    home_address = profile.get("home_address") or city
    radius_km = profile.get("max_distance_km", 15)

    # Me Time Agent
    me_report = await me_time_agent.run(profile=profile, mood_input=mood_input)
    if me_report.status == "failed":
        return "Me Time önerileri şu an üretilemedi."

    activities = me_report.result.get("activities", [])
    mood_response = me_report.result.get("mood_response", "")

    # Location Agent (mekan + trafik)
    loc_report = await location_agent.run(
        activities=activities,
        user_location=home_address,
        city=city,
        radius_km=radius_km,
    )
    enriched = loc_report.result.get("activities", activities)

    # Supabase'e kaydet
    try:
        supabase.table("me_time_suggestions").insert({
            "user_id": user_data["user_id"],
            "mood_input": mood_input,
            "activities": enriched,
        }).execute()
    except Exception:
        pass

    # Metin formatına çevir
    lines = []
    if mood_response:
        lines.append(mood_response)
    lines.append("")

    for i, act in enumerate(enriched[:6], 1):
        travel = act.get("travel")
        travel_note = f" — 🚗 {travel['recommendation']}" if travel and travel.get("recommendation") else ""
        budget = act.get("budget_range", "")
        duration = act.get("estimated_duration_hours", "")
        duration_note = f" · ~{duration} saat" if duration else ""

        lines.append(f"**{i}. {act['title']}**{travel_note}")
        lines.append(f"{act.get('description', '')}")
        lines.append(f"_{act.get('why_suitable', '')}_{duration_note} · {budget}")

        venues = act.get("venues", [])
        if venues:
            v = venues[0]
            rating = f" ⭐ {v['rating']}" if v.get("rating") else ""
            lines.append(f"📍 {v['name']}{rating} — {v.get('address', '')}")
            if v.get("maps_url"):
                lines.append(f"[Haritada gör]({v['maps_url']})")

        lines.append("")

    lines.append("Me Time sayfasında daha fazla öneri ve takvime ekleme özelliği var → /me-time/suggestions")

    return "\n".join(lines)


async def _gather_venue_context(user_message: str, user_data: dict) -> str:
    """Google Maps Places API ile doğrudan mekan araması yapar."""
    from services.external.maps import text_search_places

    # Me Time profilinden şehir bilgisi al
    city = "İstanbul"
    try:
        from core.config import get_settings
        from supabase import create_client
        s = get_settings()
        sb = create_client(s.supabase_url, s.supabase_service_key)
        profile_res = (
            sb.table("me_time_profiles")
            .select("city, district, home_address")
            .eq("user_id", user_data["user_id"])
            .execute()
        )
        if profile_res.data:
            p = profile_res.data[0]
            city = p.get("city") or city
    except Exception:
        pass

    try:
        venues = await text_search_places(
            query=user_message,
            location_bias=city,
            language_code="tr",
            max_results=6,
        )
    except Exception as exc:
        return f"Mekan araması sırasında hata oluştu: {exc}"

    if not venues:
        return f"'{user_message}' için mekan bulunamadı."

    lines = [f"**Google Maps sonuçları ({len(venues)} mekan):**\n"]
    for i, v in enumerate(venues, 1):
        rating = f" ⭐ {v['rating']}" if v.get("rating") else ""
        lines.append(f"**{i}. {v['name']}**{rating}")
        if v.get("address"):
            lines.append(f"📍 {v['address']}")
        if v.get("maps_url"):
            lines.append(f"[Google Maps'te aç]({v['maps_url']})")
        lines.append("")

    return "\n".join(lines)


async def _gather_calendar_context(credentials: Credentials) -> str:
    week_start = _current_week_monday()
    report = await calendar_agent.run(credentials, week_start)
    if report.status == "failed":
        return "Takvim verisi alınamadı."

    events = report.result.get("existing_events", [])
    if not events:
        return "Bu hafta takvimde etkinlik yok."

    lines = [f"Bu haftaki takvim ({len(events)} etkinlik):"]
    for e in events:
        start = e["start"]
        time_part = start[11:16] if len(start) > 10 else ""
        date_part = start[:10]
        lines.append(f"  - {date_part} {time_part}: {e['title']}")
    return "\n".join(lines)


def _current_week_monday() -> datetime:
    today = datetime.now(timezone.utc)
    monday = today - timedelta(days=today.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


def _sse(event_type: str, data: str) -> str:
    return json.dumps({"type": event_type, "data": data})
