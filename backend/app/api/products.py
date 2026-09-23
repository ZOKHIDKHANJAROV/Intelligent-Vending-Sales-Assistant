from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product
from ..schemas import ProductList, ProductOut

router = APIRouter(prefix="/api/v1/products", tags=["products"])

@router.get("", response_model=ProductList)
def list_products(
    db: Session = Depends(get_db),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
):
    stmt = select(Product).where(Product.is_active.is_(True))

    if category:
        stmt = stmt.where(Product.category == category)

    if search:
        term = f"%{search}%"
        stmt = stmt.where(
            Product.name.ilike(term)
            | Product.model.ilike(term)
            | Product.description.ilike(term)
        )

    items = list(db.scalars(stmt.order_by(Product.id.desc())).all())
    return ProductList(items=items, total=len(items))

@router.get("/categories/list", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    stmt = (
        select(Product.category)
        .where(Product.is_active.is_(True))
        .distinct()
        .order_by(Product.category)
    )
    return list(db.scalars(stmt).all())

@router.get("/{slug}", response_model=ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = db.scalar(
        select(Product).where(
            Product.slug == slug,
            Product.is_active.is_(True),
        )
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
