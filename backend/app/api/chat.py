from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..ai_service import build_messages, generate_answer, stream_answer
from ..database import get_db
from ..schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    result = await generate_answer(
        db=db,
        message=payload.message,
        history=[item.model_dump() for item in payload.history],
        sales_context=payload.sales_context,
    )
    return ChatResponse(**result)


@router.post("/stream")
async def chat_stream(payload: ChatRequest, db: Session = Depends(get_db)):
    # Промпт собираем до начала стрима, пока сессия БД ещё открыта
    messages = await build_messages(
        db=db,
        message=payload.message,
        history=[item.model_dump() for item in payload.history],
        sales_context=payload.sales_context,
    )
    return StreamingResponse(
        stream_answer(messages),
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
