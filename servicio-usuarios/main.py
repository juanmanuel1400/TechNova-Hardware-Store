from fastapi import FastAPI, HTTPException
from prometheus_fastapi_instrumentator import Instrumentator
from models import UsuarioLogin, UsuarioDB, UsuarioRegistro
from db import engine, Base, SessionLocal
import controllers

app = FastAPI(title="Microservicio de Usuarios - Hardware Store")
Instrumentator().instrument(app).expose(app)

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if db.query(UsuarioDB).count() == 0:
        usuarios_iniciales = [
            UsuarioDB(nombre="Estudiante", correo="admin@redes.com", password="123"),
            UsuarioDB(nombre="Gamer Pro", correo="gamer@redes.com", password="abc")
        ]
        db.add_all(usuarios_iniciales)
        db.commit()
    db.close()

@app.get("/api/usuarios")
def obtener_usuarios():
    return controllers.obtener_todos_los_usuarios()

@app.post("/api/usuarios/login")
def login(user: UsuarioLogin):
    resultado = controllers.verificar_login(user.correo, user.password)
    if resultado:
        return resultado
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

@app.post("/api/usuarios/registro")
def registro(user: UsuarioRegistro):
    resultado = controllers.registrar_usuario(user.nombre, user.correo, user.password)
    if resultado["exito"]:
        return resultado["datos"]
    raise HTTPException(status_code=400, detail=resultado["mensaje"])