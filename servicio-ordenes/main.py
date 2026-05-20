from fastapi import FastAPI, HTTPException
import requests
from models import NuevaOrden
import controllers

app = FastAPI(title="Microservicio de Órdenes - Hardware Store")

@app.post("/api/ordenes")
def crear_orden(orden: NuevaOrden):
    try:
        resultado = controllers.procesar_nueva_orden(orden.usuario_id, orden.producto_id)
        
        
        if resultado["exito"]:
            return resultado["datos"]
        else:
            raise HTTPException(status_code=resultado["status"], detail=resultado["detalle"])
            
    except requests.exceptions.RequestException:
        raise HTTPException(status_code=503, detail="El servicio de catálogo no está disponible")

@app.get("/api/ordenes")
def obtener_ordenes():
    return controllers.obtener_todas_las_ordenes()