import json
import re
import logging
import asyncio
from google import genai as google_genai
from core.config import get_settings
from core.orchestrator import AgentReport

logger = logging.getLogger(__name__)


ME_TIME_PROMPT = """Sen bir kişisel aktivite öneri asistanısın. Kullanıcının profil bilgileri ve o anki ruh hali/isteğine göre 5-8 somut aktivite fikri üreteceksin.

Kurallar:
- Öneri yelpazesi GENİŞ olsun — profil soft filtre, hard engel değil
- Her öneride neden bu kişiye uygun olduğunu kısa açıkla
- Hem ücretli hem ücretsiz seçenekler sun
- Sürpriz / beklenmedik önerileri de dahil et (örn. müzisyen biri için sergi, spor sever biri için atölye)
- Türkçe yanıt ver

Çıktı: JSON objesi, başka hiçbir şey yazma.

Format:
{
  "activities": [
    {
      "id": "1",
      "title": "Aktivite adı",
      "description": "Kısa açıklama (1-2 cümle)",
      "category": "müzik|sanat|spor|yemek|doğa|teknoloji|okuma|el_işi|film|sosyal|diğer",
      "why_suitable": "Neden bu kullanıcıya uygun (1 cümle)",
      "estimated_duration_hours": 2.0,
      "budget_range": "ücretsiz|0-200₺|200-500₺|500₺+",
      "indoor_outdoor": "iç|dış|her ikisi",
      "energy_level": "düşük|orta|yüksek",
      "search_query": "Google Maps'te arayacak İngilizce anahtar kelime (ör: 'yoga studio', 'art gallery')",
      "ticketmaster_category": "Music|Sports|Arts & Theatre|Film|Miscellaneous|null"
    }
  ],
  "mood_response": "Kullanıcının ruh haline empatiyle kısa bir yanıt (1-2 cümle)"
}"""


async def run(profile: dict, mood_input: str) -> AgentReport:
    import time
    start = time.monotonic()
    settings = get_settings()
    client = google_genai.Client(api_key=settings.google_ai_studio_api_key)

    profile_text = _format_profile(profile)
    full_prompt = f"""{ME_TIME_PROMPT}

Kullanıcı profili:
{profile_text}

Kullanıcının şu anki isteği/ruh hali:
"{mood_input}"

Bu kişiye uygun 5-8 aktivite önerisi yap."""

    try:
        resp = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=full_prompt,
        )
        raw = resp.text.strip()
        raw = _extract_json(raw)
        result = json.loads(raw)
        duration_ms = int((time.monotonic() - start) * 1000)
        return AgentReport(
            agent_name="me_time_agent",
            status="success",
            result=result,
            confidence=0.9,
            duration_ms=duration_ms,
            errors=[],
            suggestions=[],
        )
    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.error("me_time_agent başarısız: %s", exc)
        return AgentReport(
            agent_name="me_time_agent",
            status="failed",
            result={"activities": [], "mood_response": ""},
            confidence=0.0,
            duration_ms=duration_ms,
            errors=[str(exc)],
            suggestions=[],
        )


def _extract_json(text: str) -> str:
    """Claude yanıtından JSON bloğunu çıkarır. Markdown veya ön-metin olsa bile."""
    # ```json ... ``` bloğu
    if "```json" in text:
        return text.split("```json", 1)[1].split("```", 1)[0].strip()
    # ``` ... ``` bloğu
    if "```" in text:
        return text.split("```", 1)[1].split("```", 1)[0].strip()
    # İlk { ... } bloğunu bul
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        return m.group(0)
    return text


def _format_profile(profile: dict) -> str:
    lines = []
    if profile.get("city"):
        lines.append(f"Şehir: {profile['city']}" + (f", {profile['district']}" if profile.get("district") else ""))
    if profile.get("personality_score"):
        label = "İntravert" if profile["personality_score"] <= 4 else ("Ekstravert" if profile["personality_score"] >= 7 else "Ambvert")
        lines.append(f"Kişilik: {label} ({profile['personality_score']}/10)")
    if profile.get("social_preference"):
        lines.append(f"Sosyal tercih: {profile['social_preference']}")
    if profile.get("interests"):
        lines.append(f"İlgi alanları: {', '.join(profile['interests'])}")
    if profile.get("activity_goal"):
        lines.append(f"Aktivite amacı: {profile['activity_goal']}")
    if profile.get("fitness_level"):
        lines.append(f"Fitness seviyesi: {profile['fitness_level']}/5")
    if profile.get("intensity_preference"):
        lines.append(f"Tercih edilen yoğunluk: {profile['intensity_preference']}")
    if profile.get("duration_preference"):
        lines.append(f"Me Time süresi: {profile['duration_preference']}")
    if profile.get("budget_range"):
        lines.append(f"Bütçe: {profile['budget_range']}")
    if profile.get("preferred_time"):
        lines.append(f"Tercih edilen zaman: {profile['preferred_time']}")
    if profile.get("indoor_outdoor"):
        lines.append(f"Mekan tercihi: {profile['indoor_outdoor']}")
    if profile.get("has_car") is not None:
        lines.append(f"Araç: {'var' if profile['has_car'] else 'yok'}")
    if profile.get("max_distance_km"):
        lines.append(f"Maksimum mesafe: {profile['max_distance_km']} km")
    if profile.get("avoidances"):
        lines.append(f"Kaçınılacaklar: {profile['avoidances']}")
    if profile.get("constraints"):
        lines.append(f"Kısıtlamalar: {profile['constraints']}")
    return "\n".join(lines) if lines else "Profil bilgisi yok."
