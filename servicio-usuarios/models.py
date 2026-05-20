from pydantic import BaseModel

class UsuarioLogin(BaseModel):
    correo: str
    password: str