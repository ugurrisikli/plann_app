import time
import anthropic
from google.oauth2.credentials import Credentials
from core.config import get_settings
from core.orchestrator import AgentReport
from services.google.gmail import fetch_recent_messages

SYSTEM_PROMPT = """Sen bir e-posta analiz asistanısın. Verilen e-postaları okuyarak aksiyon gerektiren görevleri, deadline'ları ve önemli bilgileri çıkarırsın. Türkçe ve İngilizce e-postaları anlarsın.

Çıktını her zaman şu JSON formatında ver:
{
  "tasks": [
    {
      "title": "Görev başlığı",
      "description": "Kısa açıklama",
      "deadline": "YYYY-MM-DD veya null",
      "priority": "high|medium|low",
      "from_email": "gönderen@email.com",
      "source_subject": "Mail konusu"
    }
  ],
  "summary": "Genel özet — kaç mail incelendi, ne bulundu"
}

Sadece gerçek aksiyon gerektiren mailleri dahil et. Newsletter, otomatik bildirim, reklam gibi mailleri atla."""


async def run(credentials: Credentials, days: int = 14) -> AgentReport:
    t0 = time.monotonic()
    client = anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key)

    try:
        messages = fetch_recent_messages(credentials, days=days)
        if not messages:
            return AgentReport(
                agent_name="gmail_agent",
                status="success",
                result={"tasks": [], "summary": "Okunmamış veya işaretli mail bulunamadı."},
                duration_ms=int((time.monotonic() - t0) * 1000),
            )

        mail_text = _format_messages(messages)

        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": f"Aşağıdaki e-postaları analiz et:\n\n{mail_text}"}
            ],
        )

        import json
        raw = response.content[0].text
        # JSON bloğu varsa çıkar
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        result = json.loads(raw)
        return AgentReport(
            agent_name="gmail_agent",
            status="success",
            result=result,
            duration_ms=int((time.monotonic() - t0) * 1000),
        )

    except Exception as e:
        return AgentReport(
            agent_name="gmail_agent",
            status="failed",
            result={"tasks": [], "summary": ""},
            errors=[str(e)],
            duration_ms=int((time.monotonic() - t0) * 1000),
        )


def _format_messages(messages: list[dict]) -> str:
    parts = []
    for i, msg in enumerate(messages[:30], 1):  # max 30 mail
        parts.append(
            f"--- Mail {i} ---\n"
            f"Konu: {msg['subject']}\n"
            f"Gönderen: {msg['from']}\n"
            f"Tarih: {msg['date']}\n"
            f"Özet: {msg['snippet']}\n"
        )
    return "\n".join(parts)
