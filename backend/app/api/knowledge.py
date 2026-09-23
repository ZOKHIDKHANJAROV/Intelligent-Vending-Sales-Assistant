from pathlib import Path
from fastapi import APIRouter, HTTPException
from ..qdrant_service import upsert_documents

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])
KNOWLEDGE_DIR = Path(__file__).resolve().parents[2] / "knowledge"

@router.post("/ingest")
async def ingest_knowledge() -> dict:
    if not KNOWLEDGE_DIR.exists():
        return {"documents": 0, "message": "Knowledge directory is empty."}
    documents = []
    for point_id, path in enumerate(sorted(KNOWLEDGE_DIR.glob("*.txt")), start=1):
        text = path.read_text(encoding="utf-8").strip()
        if text:
            documents.append({"id": point_id, "title": path.stem, "source": path.name, "text": text})
    try:
        count = await upsert_documents(documents)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Knowledge ingestion failed: {exc}") from exc
    return {"documents": count, "collection": "vendai_knowledge"}
