from pydantic import BaseModel

class Producto(BaseModel):
    id: int
    nombre: str
    precio: float
    stock: int
    imagen: str