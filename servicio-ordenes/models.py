from sqlalchemy import Column, Integer, String
from db import Base
from pydantic import BaseModel

class OrdenDB(Base):
    __tablename__ = "ordenes"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, nullable=False)
    producto_id = Column(Integer, nullable=False)
    estado = Column(String, default="Completada")

class NuevaOrden(BaseModel):
    usuario_id: int
    producto_id: int