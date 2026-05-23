from db import coleccion_productos

def obtener_todos_los_productos():
    
    return list(coleccion_productos.find({}, {"_id": 0}))

def procesar_compra(producto_id: int):
    
    producto = coleccion_productos.find_one({"id": producto_id}, {"_id": 0})
    
    if producto:
        if producto["stock"] > 0:
            
            coleccion_productos.update_one(
                {"id": producto_id},
                {"$inc": {"stock": -1}}
            )
            
            producto["stock"] -= 1
            return {"mensaje": "Compra exitosa", "producto": producto}
        else:
            return {"error": "Sin stock suficiente"}
            
    return {"error": "Producto no encontrado"}