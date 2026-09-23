from pydantic import BaseModel, ConfigDict, Field

class ProductBase(BaseModel):
    slug: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=200)
    model: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=100)
    description: str = ""
    price: float | None = None
    currency: str = "UZS"
    image_url: str | None = None
    availability: str = "Под заказ"
    warranty_months: int = 12
    specifications: dict[str, str] = Field(default_factory=dict)
    advantages: list[str] = Field(default_factory=list)
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    slug: str | None = Field(default=None, min_length=1, max_length=120)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    price: float | None = None
    currency: str | None = None
    image_url: str | None = None
    availability: str | None = None
    warranty_months: int | None = None
    specifications: dict[str, str] | None = None
    advantages: list[str] | None = None
    is_active: bool | None = None

class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

class ProductList(BaseModel):
    items: list[ProductOut]
    total: int


class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=50)
    message: str = Field(default="", max_length=2000)
    product_slug: str | None = Field(default=None, max_length=120)
    source: str = Field(default="website", max_length=50)

class LeadOut(LeadCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
