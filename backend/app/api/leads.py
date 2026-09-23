from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Lead
from ..schemas import LeadCreate, LeadOut
from ..security import require_admin

router = APIRouter(prefix="/api/v1/leads", tags=["leads"])

@router.post("", response_model=LeadOut, status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

@router.get("/admin", response_model=list[LeadOut], dependencies=[Depends(require_admin)])
def list_leads(db: Session = Depends(get_db)):
    return list(db.scalars(select(Lead).order_by(Lead.id.desc())).all())

@router.patch("/{lead_id}/status", response_model=LeadOut, dependencies=[Depends(require_admin)])
def update_lead_status(
    lead_id: int,
    status: str,
    db: Session = Depends(get_db),
):
    allowed = {"new", "contacted", "closed"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid lead status")

    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.status = status
    db.commit()
    db.refresh(lead)
    return lead
