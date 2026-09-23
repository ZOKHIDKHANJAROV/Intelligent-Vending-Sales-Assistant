from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Product
from ..schemas import RecommendationOut, RecommendationRequest

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])


def _score_product(product: Product, payload: RecommendationRequest) -> int:
    text = " ".join([
        product.name or "",
        product.model or "",
        product.category or "",
        product.description or "",
        str(product.specifications or {}),
        " ".join(product.advantages or []),
    ]).lower()

    score = 0
    purpose = payload.purpose.lower()
    location = payload.location.lower()
    water_source = payload.water_source.lower()
    volume = payload.volume.lower()

    if "продаж" in purpose and ("вод" in text or "water" in text):
        score += 5
    if any(word in location for word in ("магазин", "бизнес", "жил", "объект")):
        score += 1
    if "скваж" in water_source and ("скваж" in text or "грунтов" in text):
        score += 2
    if "водопровод" in water_source and ("водопровод" in text or "мэйнс" in text or "централ" in text):
        score += 2

    if "до 500" in volume:
        score += 2 if "250" in text or "л/ч" in text else 0
    elif "500–1000" in volume or "500-1000" in volume:
        score += 1
    elif "более 1000" in volume:
        score += 1 if "1000" in text or "м3" in text else 0

    return score


@router.post("", response_model=RecommendationOut)
def recommend(payload: RecommendationRequest, db: Session = Depends(get_db)):
    products = list(
        db.scalars(
            select(Product)
            .where(Product.is_active.is_(True))
            .order_by(Product.id.desc())
        ).all()
    )

    if not products:
        return RecommendationOut(
            product={},
            explanation="Сейчас нет доступных моделей. Оставьте заявку менеджеру.",
        )

    product = max(products, key=lambda item: _score_product(item, payload))

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

    performance = product.specifications.get("Производительность", "см. характеристики")
    explanation = (
        f"Для задачи «{payload.purpose}» и установки в формате «{payload.location}» "
        f"можно рассмотреть {product.model}. "
        f"Указанная производительность — {performance}. "
        f"Источник воды: {payload.water_source}. "
        "Окончательный выбор лучше подтвердить с менеджером с учётом условий объекта."
    )

    return RecommendationOut(product=product_data, explanation=explanation)
