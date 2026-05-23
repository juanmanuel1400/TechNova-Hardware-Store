from db import SessionLocal
from models import UsuarioDB

def obtener_todos_los_usuarios():
    db = SessionLocal()
    try:
        usuarios = db.query(UsuarioDB).all()
        return [{"id": u.id, "nombre": u.nombre} for u in usuarios]
    finally:
        db.close()

def verificar_login(correo: str, password: str):
    db = SessionLocal()
    try:
        u = db.query(UsuarioDB).filter(UsuarioDB.correo == correo, UsuarioDB.password == password).first()
        if u:
            return {"token": f"fake-jwt-token-{u.id}", "mensaje": f"Bienvenido {u.nombre}"}
        return None
    finally:
        db.close()

def registrar_usuario(nombre: str, correo: str, password: str):
    db = SessionLocal()
    try:
        existe = db.query(UsuarioDB).filter(UsuarioDB.correo == correo).first()
        if existe:
            return {"exito": False, "mensaje": "El correo ya está registrado"}
        
        nuevo_usuario = UsuarioDB(nombre=nombre, correo=correo, password=password)
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        return {"exito": True, "datos": {"id": nuevo_usuario.id, "nombre": nuevo_usuario.nombre}}
    finally:
        db.close()