from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="VendAI API",
    version="0.1.0",
    description="Backend API for the VendAI vending sales platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "vendai-backend"}

@app.get("/api/v1")
def api_root() -> dict[str, str]:
    return {"service": "VendAI API", "version": "v1"}
