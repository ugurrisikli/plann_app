import time
import json
import anthropic
from google.oauth2.credentials import Credentials
from core.config import get_settings
from core.orchestrator import AgentReport
from services.google.sheets import fetch_all_content

SYSTEM_PROMPT = """Sen bir yapılacaklar listesi analiz asistanısın. Verilen Google Sheets içeriği herhangi bir formatta olabilir — tablo, liste, serbest metin, karışık. Görevleri, öncelikleri ve deadline'ları çıkar.

Çıktını her zaman şu JSON formatında ver:
{
  "tasks": [
    {
      "title": "Görev başlığı",
      "description": "Açıklama veya null",
      "deadline": "YYYY-MM-DD veya null",
      "priority": "high|medium|low",
      "category": "iş|kişisel|sağlık|finans|diğer",
      "completed": false,
      "confidence": 0.9
    }
  ],
  "summary": "Kaç görev bulundu, genel durum"
}

- Tamamlanmış görünenleri completed:true olarak işaretle
- Belirsiz olanları da dahil et, confidence değerini düşük yaz
- Öncelik belirtilmemişse içerikten tahmin et"""


async def run(credentials: Credentials, spreadsheet_id: str) -> AgentReport:
    t0 = time.monotonic()
    client = anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key)

    try:
        content = fetch_all_content(credentials, spreadsheet_id)
        if not content.strip():
            return AgentReport(
                agent_name="sheets_agent",
                status="success",
                result={"tasks": [], "summary": "Spreadsheet boş veya içerik bulunamadı."},
                duration_ms=int((time.monotonic() - t0) * 1000),
            )

        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": f"Aşağıdaki spreadsheet içeriğini analiz et:\n\n{content[:6000]}"}
            ],
        )

        raw = response.content[0].text
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        result = json.loads(raw)
        return AgentReport(
            agent_name="sheets_agent",
            status="success",
            result=result,
            duration_ms=int((time.monotonic() - t0) * 1000),
        )

    except Exception as e:
        return AgentReport(
            agent_name="sheets_agent",
            status="failed",
            result={"tasks": [], "summary": ""},
            errors=[str(e)],
            duration_ms=int((time.monotonic() - t0) * 1000),
        )
