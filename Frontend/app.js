
let carrito = [];
let modoRegistro = false;

let authModal;
let cartModal;
let historialModal;

document.addEventListener("DOMContentLoaded", () => {
  
    authModal = new bootstrap.Modal(document.getElementById('authModal'));
    cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
    

    const histElement = document.getElementById('historialModal');
    if(histElement) historialModal = new bootstrap.Modal(histElement);

    cargarProductos();
    

    verificarSesionUI();
});


async function cargarProductos() {
    try {
        const response = await fetch('/api/productos');
        const productos = await response.json();
        const contenedor = document.getElementById('productos-container'); 
        
        contenedor.innerHTML = ''; 
        
        productos.forEach(prod => {
            const card = `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 text-bg-dark border-secondary">
                        <img src="${prod.imagen}" class="card-img-top" alt="${prod.nombre}" style="height: 200px; object-fit: cover;">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title text-info">${prod.nombre}</h5>
                            <p class="card-text fs-4 fw-bold">$${prod.precio}</p>
                            <p class="card-text text-muted">Stock disponible: ${prod.stock}</p>
                            <button class="btn btn-outline-light mt-auto" 
                                onclick="agregarAlCarrito(${prod.id}, '${prod.nombre}', ${prod.precio})"
                                ${prod.stock === 0 ? 'disabled' : ''}>
                                ${prod.stock === 0 ? 'Agotado' : '<i class="fa-solid fa-cart-plus"></i> Agregar al carrito'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            contenedor.innerHTML += card;
        });
    } catch (error) {
        console.error("Error cargando el catálogo:", error);
    }
}


function agregarAlCarrito(id, nombre, precio) {
    const itemExistente = carrito.find(item => item.id === id);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ id, nombre, precio, cantidad: 1 });
    }
    actualizarCarritoUI();
    

}

function actualizarCarritoUI() {
    const contenedorCarrito = document.getElementById('cartItems');
    const totalSpan = document.getElementById('cartTotal');
    
    contenedorCarrito.innerHTML = '';
    let total = 0;

    if (carrito.length === 0) {
        contenedorCarrito.innerHTML = '<p class="text-center text-muted my-4">Tu carrito está vacío</p>';
    } else {
        carrito.forEach((item, index) => {
            total += item.precio * item.cantidad;
            contenedorCarrito.innerHTML += `
                <div class="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2 mb-2">
                    <div>
                        <h6 class="mb-0">${item.nombre}</h6>
                        <small class="text-muted">$${item.precio} x ${item.cantidad}</small>
                    </div>
                    <div class="d-flex align-items-center">
                        <span class="fw-bold text-success me-3">$${item.precio * item.cantidad}</span>
                        <button class="btn btn-sm btn-danger" onclick="eliminarDelCarrito(${index})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
    }
    totalSpan.innerText = total.toFixed(2);
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarritoUI();
}


function alternarModoAuth() {
    modoRegistro = !modoRegistro;
    document.getElementById('authTitle').innerText = modoRegistro ? "Crear Cuenta" : "Iniciar Sesión";
    document.getElementById('authSubmitBtn').innerText = modoRegistro ? "Registrarse" : "Entrar";
    document.getElementById('nombreField').style.display = modoRegistro ? "block" : "none";
    document.getElementById('toggleAuthMode').innerText = modoRegistro ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate aquí";
}

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = document.getElementById('authCorreo').value;
    const password = document.getElementById('authPassword').value;
    const nombre = document.getElementById('authNombre').value;

    const endpoint = modoRegistro ? '/api/usuarios/registro' : '/api/usuarios/login';
    const bodyData = modoRegistro ? { nombre, correo, password } : { correo, password };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });

        const data = await response.json();

        if (response.ok) {

            let usuarioId = modoRegistro ? data.id : data.token.split('-').pop(); 
            let usuarioNombre = modoRegistro ? data.nombre : data.mensaje.replace('Bienvenido ', '');
            
            localStorage.setItem('usuario_id', usuarioId);
            localStorage.setItem('usuario_nombre', usuarioNombre);
            
            authModal.hide();
            verificarSesionUI();
            
            alert(`¡Bienvenido ${usuarioNombre}!`);
            

            if (carrito.length > 0) {
                cartModal.show();
            }
        } else {
            alert("Error: " + (data.detail || "No se pudo procesar la solicitud"));
        }
    } catch (error) {
        console.error("Error en autenticación:", error);
        alert("Error de conexión con el servidor.");
    }
});

function cerrarSesion() {
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('usuario_nombre');
    verificarSesionUI();
    alert("Has cerrado sesión exitosamente.");
}

function verificarSesionUI() {
    const nombreUsuario = localStorage.getItem('usuario_nombre');
    const userDisplay = document.getElementById('userDisplay');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (nombreUsuario) {
        if(userDisplay) userDisplay.innerText = `Hola, ${nombreUsuario}`;
        if(loginBtn) loginBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
        if(userDisplay) userDisplay.innerText = '';
        if(loginBtn) loginBtn.style.display = 'inline-block';
        if(logoutBtn) logoutBtn.style.display = 'none';
    }
}


async function procesarPago() {

    const usuarioIdReal = localStorage.getItem('usuario_id');
    
    if (!usuarioIdReal) {
        cartModal.hide();
        authModal.show();
        return;
    }

    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    let errores = 0;


    for (let item of carrito) {
        
        for (let i = 0; i < item.cantidad; i++) {
            try {
                const response = await fetch('/api/ordenes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        usuario_id: parseInt(usuarioIdReal), 
                        producto_id: item.id 
                    })
                });
                
                if (!response.ok) {
                    const errData = await response.json();
                    console.error("Error en compra:", errData);
                    errores++;
                }
            } catch (error) {
                console.error("Error de red:", error);
                errores++;
            }
        }
    }

    if (errores === 0) {
        alert("¡Pago aprobado! Las órdenes han sido registradas a tu cuenta.");
        carrito = [];
        actualizarCarritoUI();
        cartModal.hide();
        cargarProductos();
    } else {
        alert(`La compra finalizó, pero hubo problemas con ${errores} producto(s) por falta de stock.`);
        carrito = [];
        actualizarCarritoUI();
        cargarProductos();
    }
}



async function cargarMisOrdenes() {
    const usuarioIdReal = localStorage.getItem('usuario_id');
    const nombreUsuario = localStorage.getItem('usuario_nombre'); 
    
    if (!usuarioIdReal) {
        authModal.show();
        return;
    }

    try {

        const resOrdenes = await fetch('/api/ordenes');
        const todasLasOrdenes = await resOrdenes.json();
        const misOrdenes = todasLasOrdenes.filter(o => o.usuario_id === parseInt(usuarioIdReal));
        

        const resProductos = await fetch('/api/productos');
        const catalogo = await resProductos.json();
        
        const contenedorHistorial = document.getElementById('historialItems');
        if (!contenedorHistorial) return;

        contenedorHistorial.innerHTML = '';
        
        if (misOrdenes.length === 0) {
            contenedorHistorial.innerHTML = '<p class="text-muted">Aún no has realizado ninguna compra.</p>';
        } else {
            misOrdenes.forEach(orden => {

                const producto = catalogo.find(p => p.id === orden.producto_id);
                const nombreProducto = producto ? producto.nombre : "Producto no encontrado";


                
                contenedorHistorial.innerHTML += `
                    <div class="alert alert-dark border-secondary d-flex justify-content-between align-items-center">
                        <div>
                            <strong class="fs-5">Orden #${orden.id}</strong><br>
                            <span class="text-primary fw-bold"><i class="fa-solid fa-user"></i> Cliente: ${nombreUsuario}</span><br>
                            <span class="text-dark fw-bold"><i class="fa-solid fa-box"></i> Producto: ${nombreProducto}</span>
                        </div>
                        <div>
                            <span class="badge text-bg-success fs-6">${orden.estado}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        if(historialModal) historialModal.show();

    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}