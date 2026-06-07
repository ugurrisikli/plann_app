import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_me_time_agent_success():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"activities": [{"id": "1", "title": "Yoga", "description": "Rahatlat", "category": "spor", "why_suitable": "Hafif yoğunluk", "estimated_duration_hours": 1.5, "budget_range": "0-200₺", "indoor_outdoor": "İç", "energy_level": "düşük", "search_query": "yoga studio", "ticketmaster_category": "null"}], "mood_response": "Harika!"}')]

    with patch("anthropic.AsyncAnthropic") as MockClient:
        MockClient.return_value.messages.create = AsyncMock(return_value=mock_response)
        import agents.me_time_agent as agent
        report = await agent.run(profile={"city": "İstanbul"}, mood_input="dinlenmek istiyorum")

    assert report.status == "success"
    assert len(report.result["activities"]) == 1
    assert report.result["activities"][0]["title"] == "Yoga"


@pytest.mark.asyncio
async def test_me_time_agent_handles_json_parse_error():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="bu geçersiz json")]

    with patch("anthropic.AsyncAnthropic") as MockClient:
        MockClient.return_value.messages.create = AsyncMock(return_value=mock_response)
        import agents.me_time_agent as agent
        report = await agent.run(profile={}, mood_input="test")

    assert report.status == "failed"
    assert report.result["activities"] == []


def test_format_profile_full():
    import agents.me_time_agent as agent
    profile = {
        "city": "İstanbul",
        "district": "Kadıköy",
        "personality_score": 7,
        "interests": ["Müzik & Konser", "Spor & Hareket"],
        "budget_range": "0-200₺",
    }
    result = agent._format_profile(profile)
    assert "İstanbul" in result
    assert "Müzik" in result


def test_format_profile_empty():
    import agents.me_time_agent as agent
    result = agent._format_profile({})
    assert result == "Profil bilgisi yok."
