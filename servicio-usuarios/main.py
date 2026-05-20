from fastapi import FastAPI, HTTPException
from models import UsuarioLogin
import controllers

app = FastAPI(title="Microservicio de Usuarios - Hardware Store")

@app.get("/api/usuarios")
def obtener_usuarios():
    return controllers.obtener_todos_los_usuarios()

@app.post("/api/usuarios/login")
def login(user: UsuarioLogin):
    resultado = controllers.verificar_login(user.correo, user.password)
    
    
    if resultado:
        return resultado
    
    raise HTTPException(status_code=401, detail="Credenciales inválidas")