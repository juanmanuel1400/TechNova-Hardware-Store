from db import usuarios_db

def obtener_todos_los_usuarios():
    
    return [{"id": u["id"], "nombre": u["nombre"]} for u in usuarios_db]

def verificar_login(correo: str, password: str):
    
    for u in usuarios_db:
        if u["correo"] == correo and u["password"] == password:
            return {"token": f"fake-jwt-token-{u['id']}", "mensaje": f"Bienvenido {u['nombre']}"}
    return None 