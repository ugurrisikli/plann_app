import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone


MOCK_PLAN_JSON = """{
  "plan": [
    {
      "title": "Proje toplantısı",
      "date": "2026-06-09",
      "start_time": "10:00",
      "end_time": "11:30",
      "duration_min": 90,
      "priority": "high",
      "source": "gmail",
      "reasoning": "Acil mail vardı"
    }
  ],
  "summary": "1 görev planlandı",
  "warnings": []
}"""


@pytest.mark.asyncio
async def test_planning_agent_success():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=MOCK_PLAN_JSON)]

    with patch("anthropic.AsyncAnthropic") as MockClient:
        MockClient.return_value.messages.create = AsyncMock(return_value=mock_response)
        import agents.planning_agent as agent
        report = await agent.run(
            gmail_tasks=[{"title": "Test görev", "priority": "high"}],
            sheets_tasks=[],
            free_slots=[{"start": "2026-06-09T09:00:00", "end": "2026-06-09T12:00:00", "duration_min": 180}],
            traffic_legs=[],
            week_start=datetime(2026, 6, 9, tzinfo=timezone.utc),
            user_preferences={},
        )

    assert report.status == "success"
    assert len(report.result["plan"]) == 1
    assert report.result["plan"][0]["title"] == "Proje toplantısı"


@pytest.mark.asyncio
async def test_planning_agent_empty_inputs():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"plan": [], "summary": "Görev yok", "warnings": []}')]

    with patch("anthropic.AsyncAnthropic") as MockClient:
        MockClient.return_value.messages.create = AsyncMock(return_value=mock_response)
        import agents.planning_agent as agent
        report = await agent.run(
            gmail_tasks=[],
            sheets_tasks=[],
            free_slots=[],
            traffic_legs=[],
            week_start=datetime(2026, 6, 9, tzinfo=timezone.utc),
            user_preferences={},
        )

    assert report.status == "success"
    assert report.result["plan"] == []
