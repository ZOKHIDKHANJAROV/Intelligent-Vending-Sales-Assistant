from pydantic import BaseModel, ConfigDict

class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    model: str
    category: str
    description: str
    price: float | None
    currency: str
    image_url: str | None
    availability: str
    warranty_months: int
    specifications: dict
    advantages: list
    is_active: bool

class ProductList(BaseModel):
    items: list[ProductOut]
    total: int
