from pydantic import BaseModel
from typing import Literal, Any
import asyncio
import time


class AgentReport(BaseModel):
    agent_name: str
    status: Literal["success", "partial", "failed"]
    result: dict[str, Any]
    confidence: float = 1.0  # 0.0 - 1.0
    duration_ms: int = 0
    errors: list[str] = []
    suggestions: list[str] = []


class AgentTask(BaseModel):
    agent_name: str
    instruction: str
    context: dict[str, Any] = {}
    timeout_sec: int = 30


async def run_parallel(tasks: list[tuple]) -> list[AgentReport]:
    """
    [(agent_fn, kwargs), ...] listesini paralel çalıştırır.
    Herhangi biri başarısız olursa diğerleri etkilenmez.
    """
    async def safe_run(fn, kwargs):
        t0 = time.monotonic()
        try:
            result = await fn(**kwargs)
            return result
        except Exception as e:
            agent_name = kwargs.get("agent_name", fn.__name__)
            return AgentReport(
                agent_name=agent_name,
                status="failed",
                result={},
                errors=[str(e)],
                duration_ms=int((time.monotonic() - t0) * 1000),
            )

    return await asyncio.gather(*[safe_run(fn, kw) for fn, kw in tasks])
