from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.products import router as products_router
from .database import Base, SessionLocal, engine
from .seed import seed_products

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_products(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="VendAI API",
    version="0.2.0",
    description="Backend API for the VendAI vending sales platform.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router)

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "vendai-backend"}

@app.get("/api/v1")
def api_root() -> dict[str, str]:
    return {"service": "VendAI API", "version": "v1"}
