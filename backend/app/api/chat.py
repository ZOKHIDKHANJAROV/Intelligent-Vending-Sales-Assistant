from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..ai_service import generate_answer
from ..database import get_db
from ..schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    result = await generate_answer(
        db=db,
        message=payload.message,
        history=[item.model_dump() for item in payload.history],
    )
    return ChatResponse(**result)
