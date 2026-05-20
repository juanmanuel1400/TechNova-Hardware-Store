import requests
import os
from db import ordenes_db


CATALOGO_URL = os.getenv("CATALOGO_URL", "http://localhost:8000")

def obtener_todas_las_ordenes():
    return ordenes_db

def procesar_nueva_orden(usuario_id: int, producto_id: int):
    
    url_compra = f"{CATALOGO_URL}/api/productos/{producto_id}/comprar"
    respuesta_catalogo = requests.put(url_compra)
    datos_catalogo = respuesta_catalogo.json()

    if respuesta_catalogo.status_code == 200 and "error" not in datos_catalogo:
        nueva_orden = {
            "id": len(ordenes_db) + 1,
            "usuario_id": usuario_id,
            "producto_id": producto_id,
            "estado": "Completada"
        }
        ordenes_db.append(nueva_orden)
        return {"exito": True, "datos": {"mensaje": "Orden creada con éxito", "orden": nueva_orden}}
    else:
        return {"exito": False, "status": 400, "detalle": datos_catalogo.get("error", "Error en el catálogo")}