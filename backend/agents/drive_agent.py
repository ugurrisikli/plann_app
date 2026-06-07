import anthropic
import time
from google.oauth2.credentials import Credentials
from core.config import get_settings
from core.orchestrator import AgentReport
from services.google.drive import list_recent_files, read_doc_content


DRIVE_PROMPT = """Kullanıcının Google Drive dosyalarını analiz ediyorsun. Görevin:
1. Dosya listesine bakarak hangilerinin haftalık planlama için bağlam sağlayabileceğini belirle
2. Proje notları, toplantı özetleri, önemli belgeler gibi dosyaları önceliklendir
3. Kısa ve kullanılabilir bir özet döndür

Çıktı JSON:
{
  "relevant_files": [
    {"name": "...", "id": "...", "reason": "neden ilgili"}
  ],
  "context": "haftalık planlama için özet bağlam (2-3 cümle)",
  "suggestions": ["CEO ajanı için öneri 1", "öneri 2"]
}"""


async def run(credentials: Credentials, read_content: bool = False) -> AgentReport:
    start = time.monotonic()
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    try:
        # Son 20 dosyayı listele
        files = list_recent_files(credentials, max_results=20)
        if not files:
            return AgentReport(
                agent_name="drive_agent",
                status="success",
                result={"relevant_files": [], "context": "Drive'da dosya bulunamadı.", "suggestions": []},
                confidence=1.0,
                duration_ms=int((time.monotonic() - start) * 1000),
                errors=[],
                suggestions=[],
            )

        files_text = "\n".join(
            f"- {f['name']} ({f.get('mimeType', '').split('.')[-1]}) — son değişiklik: {f.get('modifiedTime', '')[:10]}"
            for f in files
        )

        # Belirli içerik okuma (opsiyonel, yavaş olabilir)
        content_samples = []
        if read_content:
            doc_files = [f for f in files[:5] if "document" in f.get("mimeType", "")]
            for doc in doc_files[:2]:
                try:
                    text = read_doc_content(credentials, doc["id"])
                    content_samples.append(f"\n--- {doc['name']} ---\n{text[:500]}")
                except Exception:
                    pass

        user_content = f"Dosya listesi:\n{files_text}"
        if content_samples:
            user_content += "\n\nİçerik örnekleri:" + "".join(content_samples)

        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            messages=[{"role": "user", "content": f"{DRIVE_PROMPT}\n\n{user_content}"}],
        )

        import json
        raw = resp.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```json")[-1].split("```")[0].strip()
        result = json.loads(raw)

        duration_ms = int((time.monotonic() - start) * 1000)
        return AgentReport(
            agent_name="drive_agent",
            status="success",
            result=result,
            confidence=0.8,
            duration_ms=duration_ms,
            errors=[],
            suggestions=result.get("suggestions", []),
        )

    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        return AgentReport(
            agent_name="drive_agent",
            status="failed",
            result={"relevant_files": [], "context": "", "suggestions": []},
            confidence=0.0,
            duration_ms=duration_ms,
            errors=[str(exc)],
            suggestions=[],
        )
