from sqlalchemy import Column, Integer, String
from db import Base
from pydantic import BaseModel


class UsuarioDB(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    correo = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)


class UsuarioLogin(BaseModel):
    correo: str
    password: str


class UsuarioRegistro(BaseModel):
    nombre: str
    correo: str
    password: str