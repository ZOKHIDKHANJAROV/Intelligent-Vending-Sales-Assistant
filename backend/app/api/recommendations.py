from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product
from ..schemas import RecommendationOut, RecommendationRequest

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])


@router.post("", response_model=RecommendationOut)
def recommend(payload: RecommendationRequest, db: Session = Depends(get_db)):
    product = db.scalar(
        select(Product)
        .where(Product.is_active.is_(True))
        .order_by(Product.id.desc())
    )

    if product is None:
        return RecommendationOut(
            product={},
            explanation="Сейчас нет доступных моделей. Оставьте заявку менеджеру.",
        )

    product_data = {
        "id": product.id,
        "slug": product.slug,
        "name": product.name,
        "model": product.model,
        "category": product.category,
        "description": product.description,
        "price": product.price,
        "currency": product.currency,
        "image_url": product.image_url,
        "availability": product.availability,
        "warranty_months": product.warranty_months,
        "specifications": product.specifications or {},
        "advantages": product.advantages or [],
    }

    explanation = (
        f"Для задачи «{payload.purpose}» и установки в формате «{payload.location}» "
        f"можно рассмотреть {product.model}. "
        f"Указанный в каталоге объём — {product.specifications.get('Производительность', 'см. характеристики')}. "
        "Окончательный выбор лучше подтвердить с менеджером с учётом условий объекта."
    )

    return RecommendationOut(product=product_data, explanation=explanation)
