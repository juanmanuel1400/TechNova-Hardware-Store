from db import inventario

def obtener_todos_los_productos():
    return inventario

def procesar_compra(producto_id: int):
    
    for producto in inventario:
        if producto["id"] == producto_id:
            if producto["stock"] > 0:
                producto["stock"] -= 1
                return {"mensaje": "Compra exitosa", "producto": producto}
            else:
                return {"error": "Sin stock suficiente"}
    
    return {"error": "Producto no encontrado"}