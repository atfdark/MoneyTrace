"""AI Assistant endpoints - placeholder."""

from fastapi import APIRouter

router = APIRouter()


@router.post("/chat", name="assistant-chat")
async def chat() -> dict[str, str]:
    """Send a message to the AI assistant."""
    return {"message": "Assistant chat endpoint placeholder"}


@router.get("/conversations", name="assistant-conversations")
async def list_conversations() -> dict[str, str]:
    """List conversation history."""
    return {"message": "Assistant conversations endpoint placeholder"}


@router.get("/conversations/{conversation_id}", name="assistant-conversation-detail")
async def get_conversation(conversation_id: str) -> dict[str, str]:
    """Get a specific conversation."""
    return {"message": f"Conversation {conversation_id} endpoint placeholder"}


@router.post("/summarize", name="assistant-summarize")
async def summarize() -> dict[str, str]:
    """Request AI summarization of a case."""
    return {"message": "Assistant summarize endpoint placeholder"}
