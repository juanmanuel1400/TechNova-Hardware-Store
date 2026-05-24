let authModal = null;
let historialModal = null;
let pagoModalObj = null;

let esModoRegistro = false;
let productoAPagarId = null;


document.addEventListener("DOMContentLoaded", () => {
    authModal = new bootstrap.Modal(document.getElementById('authModal'));
    historialModal = new bootstrap.Modal(document.getElementById('historialModal'));
    pagoModalObj = new bootstrap.Modal(document.getElementById('pagoModal'));

    
    document.getElementById("formAuth").addEventListener("submit", manejarAutenticacion);

    comprobarEstadoSesion();
    cargarProductos();
});


function comprobarEstadoSesion() {
    const nombreUsuario = localStorage.getItem('usuario_nombre');
    const btnAuth = document.getElementById('btnAuth');
    if (nombreUsuario) {
        btnAuth.innerHTML = `<i class="fa-solid fa-user-check"></i> Hola, ${nombreUsuario}`;
        btnAuth.className = "btn btn-info";
        btnAuth.onclick = cerrarSesion;
    } else {
        btnAuth.innerHTML = `<i class="fa-solid fa-user"></i> Iniciar Sesión`;
        btnAuth.className = "btn btn-outline-light";
        btnAuth.onclick = abrirAuthModal;
    }
}

function abrirAuthModal() {
    authModal.show();
}

function cerrarSesion() {
    if (confirm("¿Deseas cerrar tu sesión?")) {
        localStorage.clear();
        comprobarEstadoSesion();
        window.location.reload();
    }
}


function conmutarModoAuth() {
    esModoRegistro = !esModoRegistro;
    const titulo = document.getElementById("authModalTitle");
    const grupoNombre = document.getElementById("grupoNombre");
    const btnSubmit = document.getElementById("btnAuthSubmit");
    const btnCambiar = document.getElementById("btnCambiarModo");

    if (esModoRegistro) {
        titulo.innerText = "Crear Cuenta";
        grupoNombre.classList.remove("d-none");
        document.getElementById("authNombre").required = true;
        btnSubmit.innerText = "Registrarse";
        btnCambiar.innerText = "¿Ya tienes cuenta? Inicia sesión";
    } else {
        titulo.innerText = "Iniciar Sesión";
        grupoNombre.classList.add("d-none");
        document.getElementById("authNombre").required = false;
        btnSubmit.innerText = "Ingresar";
        btnCambiar.innerText = "¿No tienes cuenta? Regístrate";
    }
}


async function manejarAutenticacion(e) {
    e.preventDefault();
    const correo = document.getElementById("authCorreo").value;
    const password = document.getElementById("authPassword").value;

    if (esModoRegistro) {
        const nombre = document.getElementById("authNombre").value;
        try {
            const res = await fetch("/api/usuarios/registro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, correo, password })
            });
            if (res.ok) {
                alert("¡Cuenta registrada con éxito! Ahora inicia sesión.");
                conmutarModoAuth();
            } else {
                alert("Error al registrar cuenta. El correo podría estar en uso.");
            }
        } catch (err) {
            console.error(err);
        }
    } else {
        try {
            const res = await fetch("/api/usuarios/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo, password })
            });
            if (res.ok) {
                const datosUsuario = await res.json();
                localStorage.setItem('usuario_id', datosUsuario.id);
                localStorage.setItem('usuario_nombre', datosUsuario.nombre);
                authModal.hide();
                comprobarEstadoSesion();
                document.getElementById("formAuth").reset();
            } else {
                alert("Credenciales incorrectas. Inténtalo de nuevo.");
            }
        } catch (err) {
            console.error(err);
        }
    }
}


async function cargarProductos() {
    const lista = document.getElementById("listaProductos");
    if (!lista) return;

    try {
        const res = await fetch("/api/productos");
        const productos = await res.json();
        lista.innerHTML = "";

        productos.forEach(producto => {
            lista.innerHTML += `
                <div class="col">
                    <div class="card h-100 text-light shadow-sm">
                        <div class="card-body d-flex flex-column justify-content-between">
                            <div>
                                <h5 class="card-title fw-bold text-info">${producto.nombre}</h5>
                                <p class="card-text text-muted small">${producto.descripcion}</p>
                            </div>
                            <div class="mt-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="fs-4 fw-bold text-success">$${producto.precio.toLocaleString()}</span>
                                    <span class="badge ${producto.stock > 0 ? 'bg-secondary' : 'bg-danger'}">Stock: ${producto.stock}</span>
                                </div>
                                <button class="btn btn-primary w-100" ${producto.stock === 0 ? 'disabled' : ''} onclick="abrirModalPago(${producto.id})">
                                    <i class="fa-solid fa-bag-shopping"></i> Comprar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Error cargando productos:", err);
        lista.innerHTML = `<p class="text-danger">No se pudo conectar con el microservicio de catálogo.</p>`;
    }
}


function abrirModalPago(productoId) {
    const usuarioId = localStorage.getItem('usuario_id');
    if (!usuarioId) {
        authModal.show();
        return;
    }
    productoAPagarId = productoId;
    pagoModalObj.show();
}

async function procesarPago() {
    if (!productoAPagarId) return;
    
    const btnPagar = document.getElementById('btnProcesarPago');
    

    btnPagar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validando tarjeta...';
    btnPagar.disabled = true;
    
    setTimeout(async () => {
        const usuarioId = localStorage.getItem('usuario_id');
        
        try {
            const response = await fetch(`/api/productos/${productoAPagarId}/comprar?usuario_id=${usuarioId}`, {
                method: 'PUT'
            });
            
            if (response.ok) {
                alert("¡Transacción aprobada! Tu orden ha sido generada en el sistema.");
                cargarProductos(); 
            } else {
                alert("La transacción fue rechazada o el artículo se quedó sin stock.");
            }
        } catch (error) {
            console.error("Error en la transacción:", error);
            alert("Ocurrió un error al procesar el pago con el servidor.");
        } finally {
            pagoModalObj.hide();
            btnPagar.innerHTML = '<i class="fa-solid fa-lock"></i> Pagar de forma segura';
            btnPagar.disabled = false;
            document.getElementById('formPago').reset();
            productoAPagarId = null;
        }
    }, 1500);
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
                const nombreProducto = producto ? producto.nombre : "Producto no identificado";

                
                contenedorHistorial.innerHTML += `
                    <div class="alert alert-dark border-secondary d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <strong class="fs-5 text-light">Orden #${orden.id}</strong><br>
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
        
        if (historialModal) historialModal.show();

    } catch (error) {
        console.error("Error cargando historial de órdenes:", error);
        alert("No se pudo recuperar el historial. Por favor comprueba las APIs.");
    }
}