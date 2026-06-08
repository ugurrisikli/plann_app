import time
import json
from datetime import datetime
from google import genai as google_genai
from core.config import get_settings
from core.orchestrator import AgentReport

SYSTEM_PROMPT = """Sen bir haftalık yaşam planlama asistanısın. Kullanıcının görevlerini, takvim müsaitliğini ve trafik bilgilerini alarak gerçekçi ve uygulanabilir bir haftalık plan üretirsin.

KRİTİK KURAL: Sana verilen listedeki TÜM görevleri plan içinde dağıt. İmkansız olmadığı sürece (deadline geçmişse, süre yetmiyorsa) hiçbir görevi atlama. Az sayıda görev bile olsa her birini ayrı bir plan öğesi olarak yaz.

Planlama Kuralları:
- Her göreve gerçekçi süre ata: basit görev 30-60 dk, karmaşık 90-180 dk
- Önceliği HIGH olan görevleri haftanın ilk yarısına al
- Deadline'ı olan görevleri mutlaka o tarihten en az 1 gün önce planla
- Konumlu görevlerde trafik süresi + 15 dk buffer ekle
- Sabah 09:00-12:00 → odak gerektiren işler; 13:00-17:00 → görüşme/toplantı; 17:00+ → hafif/idari
- Bir güne MAX 5 görev (yaklaşık 5-6 saat); günlere dengeli dağıt
- Her görev için kısa ama anlamlı bir gerekçe yaz

Çıktını SADECE geçerli JSON olarak ver, başka hiçbir metin ekleme:
{
  "plan": [
    {
      "title": "Görev adı",
      "description": "1-2 cümle açıklama",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "duration_min": 60,
      "priority": "high|medium|low",
      "source": "sheets|gmail|manual",
      "location": null,
      "travel_time_min": null,
      "reasoning": "Neden bu gün ve saatte planlandı (1 cümle)"
    }
  ],
  "summary": "Haftalık plan özeti: toplam X görev, en kritik Y, öne çıkan noktalar",
  "warnings": []
}"""


async def run(
    gmail_tasks: list[dict],
    sheets_tasks: list[dict],
    free_slots: list[dict],
    traffic_legs: list[dict],
    week_start: datetime,
    user_preferences: dict | None = None,
    drive_context: str | None = None,
) -> AgentReport:
    import asyncio
    t0 = time.monotonic()
    settings = get_settings()
    client = google_genai.Client(api_key=settings.google_ai_studio_api_key)
    prefs = user_preferences or {}

    context = _build_context(
        gmail_tasks, sheets_tasks, free_slots, traffic_legs, week_start, prefs, drive_context
    )
    full_prompt = f"{SYSTEM_PROMPT}\n\n{context}"

    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=full_prompt,
        )

        raw = response.text.strip()
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        result = json.loads(raw)
        return AgentReport(
            agent_name="planning_agent",
            status="success",
            result=result,
            duration_ms=int((time.monotonic() - t0) * 1000),
        )

    except Exception as e:
        return AgentReport(
            agent_name="planning_agent",
            status="failed",
            result={"plan": [], "summary": "", "warnings": []},
            errors=[str(e)],
            duration_ms=int((time.monotonic() - t0) * 1000),
        )


def _build_context(
    gmail_tasks, sheets_tasks, free_slots, traffic_legs, week_start, prefs,
    drive_context: str | None = None,
) -> str:
    parts = [
        f"Hafta başlangıcı: {week_start.strftime('%Y-%m-%d')} ({week_start.strftime('%A')})",
        f"Çalışma saatleri: {prefs.get('work_start', 9)}:00 - {prefs.get('work_end', 20)}:00",
        "",
    ]

    if sheets_tasks:
        parts.append("=== YAPILACAKLAR LİSTESİNDEN GÖREVLER ===")
        for t in sheets_tasks:
            deadline = f" | Deadline: {t['deadline']}" if t.get("deadline") else ""
            parts.append(f"- [{t['priority'].upper()}] {t['title']}{deadline} ({t.get('category', '')})")
        parts.append("")

    if gmail_tasks:
        parts.append("=== MAİLLERDEN GÖREVLER ===")
        for t in gmail_tasks:
            deadline = f" | Deadline: {t['deadline']}" if t.get("deadline") else ""
            parts.append(f"- [{t['priority'].upper()}] {t['title']}{deadline}")
            parts.append(f"  Kaynak: {t.get('source_subject', '')}")
        parts.append("")

    if free_slots:
        parts.append("=== MÜSAİT ZAMAN DİLİMLERİ ===")
        for slot in free_slots[:20]:
            parts.append(f"- {slot['start']} → {slot['end']} ({slot['duration_min']} dk)")
        parts.append("")

    if traffic_legs:
        parts.append("=== TRAFİK BİLGİSİ ===")
        for leg in traffic_legs:
            if leg.get("duration_traffic_min"):
                parts.append(
                    f"- {leg['label']}: ~{leg['duration_traffic_min']} dk "
                    f"({leg['traffic_label']})"
                )
        parts.append("")

    if drive_context:
        parts.append("=== DRIVE BAĞLAMI ===")
        parts.append(drive_context)
        parts.append("")

    total = len(gmail_tasks) + len(sheets_tasks)
    parts.append(
        f"Yukarıdaki {total} görevi ({len(gmail_tasks)} mail, {len(sheets_tasks)} yapılacaklar) "
        f"bu hafta için müsait zaman dilimlerine dağıt. "
        f"Her görevi plan dizisine dahil et."
    )
    return "\n".join(parts)
