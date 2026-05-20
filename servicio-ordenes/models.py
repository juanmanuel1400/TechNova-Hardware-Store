from pydantic import BaseModel

class NuevaOrden(BaseModel):
    usuario_id: int
    producto_id: int