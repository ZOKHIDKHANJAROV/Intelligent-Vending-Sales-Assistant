import os
import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "vendai_knowledge")
EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
client = QdrantClient(url=QDRANT_URL)

async def embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=90) as http:
        response = await http.post(f"{OLLAMA_BASE_URL}/api/embed", json={"model": EMBEDDING_MODEL, "input": text})
        response.raise_for_status()
        data = response.json()
    embeddings = data.get("embeddings") or []
    if not embeddings:
        raise RuntimeError("Ollama returned no embedding")
    return embeddings[0]

async def ensure_collection() -> None:
    try:
        client.get_collection(QDRANT_COLLECTION)
        return
    except Exception:
        pass
    vector = await embed("VendAI knowledge base")
    client.create_collection(
        collection_name=QDRANT_COLLECTION,
        vectors_config=VectorParams(size=len(vector), distance=Distance.COSINE),
    )

async def upsert_documents(documents: list[dict]) -> int:
    await ensure_collection()
    points = []
    for index, document in enumerate(documents):
        vector = await embed(document["text"])
        points.append(PointStruct(
            id=document.get("id", index + 1),
            vector=vector,
            payload={"text": document["text"], "title": document.get("title", ""), "source": document.get("source", "manual")},
        ))
    if points:
        client.upsert(collection_name=QDRANT_COLLECTION, points=points)
    return len(points)

async def search_documents(query: str, limit: int = 4) -> list[dict]:
    await ensure_collection()
    vector = await embed(query)
    result = client.query_points(collection_name=QDRANT_COLLECTION, query=vector, limit=limit, with_payload=True)
    return [
        {"score": float(point.score), "text": (point.payload or {}).get("text", ""), "title": (point.payload or {}).get("title", ""), "source": (point.payload or {}).get("source", "")}
        for point in result.points
    ]
