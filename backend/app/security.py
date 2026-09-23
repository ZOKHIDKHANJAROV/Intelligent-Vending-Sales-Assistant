import os

from fastapi import Header, HTTPException

def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    expected = os.getenv("ADMIN_API_KEY", "")
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="ADMIN_API_KEY is not configured",
        )
    if x_admin_key != expected:
        raise HTTPException(status_code=401, detail="Invalid admin key")
