import requests
import os
from db import SessionLocal
from models import OrdenDB

CATALOGO_URL = os.getenv("CATALOGO_URL", "http://localhost:8000")

def obtener_todas_las_ordenes():
    db = SessionLocal()
    try:
        ordenes = db.query(OrdenDB).all()
        return [{"id": o.id, "usuario_id": o.usuario_id, "producto_id": o.producto_id, "estado": o.estado} for o in ordenes]
    finally:
        db.close()

def procesar_nueva_orden(usuario_id: int, producto_id: int):
    url_compra = f"{CATALOGO_URL}/api/productos/{producto_id}/comprar"
    respuesta_catalogo = requests.put(url_compra)
    datos_catalogo = respuesta_catalogo.json()

    if respuesta_catalogo.status_code == 200 and "error" not in datos_catalogo:
        db = SessionLocal()
        try:
            nueva_orden = OrdenDB(usuario_id=usuario_id, producto_id=producto_id, estado="Completada")
            db.add(nueva_orden)
            db.commit()
            db.refresh(nueva_orden)
            return {
                "exito": True, 
                "datos": {
                    "mensaje": "Orden creada con éxito", 
                    "orden": {"id": nueva_orden.id, "usuario_id": nueva_orden.usuario_id, "producto_id": nueva_orden.producto_id, "estado": nueva_orden.estado}
                }
            }
        finally:
            db.close()
    else:
        return {"exito": False, "status": 400, "detalle": datos_catalogo.get("error", "Error en el catálogo")}