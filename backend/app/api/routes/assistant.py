"""
AI assistant endpoints for natural language queries.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx
from typing import Dict, Any

from app.database import get_db
from app.config import settings

router = APIRouter()


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str
    user_id: str = "usr_default"
    context: dict = {}


@router.post("/chat")
async def chat_with_assistant(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """
    Send message to AI assistant and get response from Strands Multi-Agent Orchestrator.
    """
    try:
        from ai.agents.orchestrator import orchestrator
        lat = request.context.get("lat")
        lon = request.context.get("lon")
        if lat is None or lon is None:
            raise HTTPException(status_code=400, detail="A valid location is required for the assistant")
        
        result = await orchestrator.process_query(
            query=request.message,
            lat=lat,
            lon=lon,
            user_context=request.context
        )
        return {
            "response": result.get("response", ""),
            "active_agents": result.get("active_agents", []),
            "agent_details": result.get("agent_details", {}),
            "tool_executions": result.get("tool_executions", []),
            "suggestions": [
                "Can I go running today?",
                "Why is AQI high?",
                "Give me the cleanest route home",
                "Is my school safe right now?"
            ],
            "timestamp": result.get("timestamp")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI assistant provider is unavailable: {e}") from e
