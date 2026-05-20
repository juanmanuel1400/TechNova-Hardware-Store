from fastapi import FastAPI
import controllers 

app = FastAPI(title="Microservicio de Catálogo - Hardware Store")

@app.get("/api/productos")
def obtener_productos():
    
    return controllers.obtener_todos_los_productos()

@app.put("/api/productos/{producto_id}/comprar")
def comprar_producto(producto_id: int):
    
    return controllers.procesar_compra(producto_id)