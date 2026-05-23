from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
import controllers
from db import inicializar_base_de_datos

app = FastAPI(title="Microservicio de Catálogo - Hardware Store")

Instrumentator().instrument(app).expose(app)


@app.on_event("startup")
def startup_event():
    inicializar_base_de_datos()

@app.get("/api/productos")
def obtener_productos():
    return controllers.obtener_todos_los_productos()

@app.put("/api/productos/{producto_id}/comprar")
def comprar_producto(producto_id: int):
    return controllers.procesar_compra(producto_id)