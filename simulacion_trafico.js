import http from 'k6/http';
import { sleep, check } from 'k6';

// Configuración de la prueba de carga
export const options = {
  scenarios: {
    navegadores: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'flujoNavegacion',
    },
    compradores: {
      executor: 'constant-vus',
      vus: 8,
      duration: '30s',
      exec: 'flujoCompra',
    },
    compradores_compulsivos: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',
      exec: 'flujoCompulsivo',
    },
  },
};

const BASE_URL = 'http://localhost:8080';

// Lista de categorías para enriquecer los eventos en Spark
const CATEGORIES = {
  1: 'Componentes',   // RTX 4090
  2: 'Componentes',   // Core i9
  3: 'Memorias',       // RAM 32GB
  4: 'Componentes',   // Placa Base
  5: 'Componentes',   // Fuente Poder
  6: 'Monitores',      // Monitor 27"
  7: 'Periféricos',    // Teclado Mecánico
  8: 'Periféricos',    // Mouse Gamer
  9: 'Almacenamiento', // SSD 1TB
  10: 'Audio',         // Auriculares
};

// Generador de timestamp simulado con curva diurna realista
// Esto crea datos distribuidos en 24 horas con picos por la noche y valles en la madrugada
function getSimulatedTimestamp() {
  const now = new Date();
  
  // Distribución de probabilidad para las horas del día (0-23)
  // Mayor peso para horas pico (18:00 - 22:00) y menor para la madrugada (02:00 - 05:00)
  const hourWeights = [
    5, 3, 2, 1, 1, 2, 4, 6, 8, 10, 12, 11, 13, 14, 12, 13, 15, 17, 22, 25, 24, 20, 14, 8
  ];
  const totalWeight = hourWeights.reduce((a, b) => a + b, 0);
  let randomVal = Math.random() * totalWeight;
  let simulatedHour = 0;
  
  for (let i = 0; i < hourWeights.length; i++) {
    randomVal -= hourWeights[i];
    if (randomVal <= 0) {
      simulatedHour = i;
      break;
    }
  }

  const simulatedMinute = Math.floor(Math.random() * 60);
  const simulatedSecond = Math.floor(Math.random() * 60);
  
  const simDate = new Date(now);
  simDate.setHours(simulatedHour, simulatedMinute, simulatedSecond);
  
  // Si la fecha resultante es en el futuro respecto a hoy, la movemos al día anterior
  if (simDate > now) {
    simDate.setDate(simDate.getDate() - 1);
  }
  
  return simDate.toISOString();
}

function logBusinessEvent(eventType, payload) {
  const event = Object.assign({
    timestamp: getSimulatedTimestamp(),
    event_type: eventType,
    session_id: `sess_${Math.random().toString(36).substring(2, 15)}`,
    device: Math.random() > 0.3 ? 'desktop' : 'mobile'
  }, payload);
  // Usamos el prefijo [BIZ_EVENT] para filtrarlo fácilmente desde la consola
  console.log(`[BIZ_EVENT] ${JSON.stringify(event)}`);
}

// 1. Flujo de Navegación: Usuarios que solo navegan y ven catálogo
export function flujoNavegacion() {
  const userNum = Math.floor(Math.random() * 100000);
  const nombre = `UserNavegante_${userNum}`;
  const correo = `navegante_${userNum}@technova.com`;
  const password = `pass_${userNum}`;

  // Intenta registrarse (Opcional)
  let userId = null;
  const isNew = Math.random() > 0.5;

  if (isNew) {
    const startReg = Date.now();
    const regRes = http.post(
      `${BASE_URL}/api/usuarios/registro`,
      JSON.stringify({ nombre, correo, password }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const latency = Date.now() - startReg;

    if (regRes.status === 200) {
      const data = JSON.parse(regRes.body);
      userId = data.id;
      logBusinessEvent('user_registered', {
        user_id: userId,
        email: correo,
        status: 'success',
        latency_ms: latency
      });
    } else {
      logBusinessEvent('user_registered', {
        email: correo,
        status: 'failed',
        error_type: regRes.json('detail') || 'unknown',
        latency_ms: latency
      });
    }
  }

  // Si no es nuevo, o falló el registro, navega de manera anónima
  sleep(Math.random() * 2 + 1);

  // Consulta el catálogo
  const startCat = Date.now();
  const catRes = http.get(`${BASE_URL}/api/productos`);
  const catLatency = Date.now() - startCat;

  if (catRes.status === 200) {
    const productos = JSON.parse(catRes.body);
    logBusinessEvent('catalog_browsed', {
      user_id: userId,
      items_count: productos.length,
      status: 'success',
      latency_ms: catLatency
    });

    // Simula ver 1 o 2 productos en detalle
    const views = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < views; i++) {
      sleep(Math.random() * 1 + 0.5);
      const prod = productos[Math.floor(Math.random() * productos.length)];
      logBusinessEvent('product_viewed', {
        user_id: userId,
        product_id: prod.id,
        product_name: prod.nombre,
        category: CATEGORIES[prod.id] || 'Otros',
        price: prod.precio
      });
    }
  } else {
    logBusinessEvent('catalog_browsed', {
      user_id: userId,
      status: 'failed',
      error_type: 'network_or_server_error',
      latency_ms: catLatency
    });
  }
}

// 2. Flujo de Compra: Usuarios decididos que entran, ven y compran
export function flujoCompra() {
  const userNum = Math.floor(Math.random() * 100000);
  const nombre = `Comprador_${userNum}`;
  const correo = `comprador_${userNum}@technova.com`;
  const password = `pass_${userNum}`;

  // 1. Registro obligatorio para comprar
  let userId = null;
  const startReg = Date.now();
  const regRes = http.post(
    `${BASE_URL}/api/usuarios/registro`,
    JSON.stringify({ nombre, correo, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const regLatency = Date.now() - startReg;

  if (regRes.status === 200) {
    userId = JSON.parse(regRes.body).id;
    logBusinessEvent('user_registered', {
      user_id: userId,
      email: correo,
      status: 'success',
      latency_ms: regLatency
    });
  } else {
    logBusinessEvent('user_registered', {
      email: correo,
      status: 'failed',
      error_type: 'duplicate_or_error',
      latency_ms: regLatency
    });
    return; // Si no puede registrarse, aborta
  }

  sleep(1);

  // 2. Login
  const startLog = Date.now();
  const logRes = http.post(
    `${BASE_URL}/api/usuarios/login`,
    JSON.stringify({ correo, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const logLatency = Date.now() - startLog;

  if (logRes.status === 200) {
    logBusinessEvent('user_logged_in', {
      user_id: userId,
      email: correo,
      status: 'success',
      latency_ms: logLatency
    });
  } else {
    logBusinessEvent('user_logged_in', {
      user_id: userId,
      email: correo,
      status: 'failed',
      error_type: 'unauthorized',
      latency_ms: logLatency
    });
    return;
  }

  sleep(1);

  // 3. Ver Catálogo y Seleccionar
  const catRes = http.get(`${BASE_URL}/api/productos`);
  if (catRes.status === 200) {
    const productos = JSON.parse(catRes.body);
    // Seleccionar un producto aleatorio
    const prod = productos[Math.floor(Math.random() * productos.length)];

    logBusinessEvent('product_viewed', {
      user_id: userId,
      product_id: prod.id,
      product_name: prod.nombre,
      category: CATEGORIES[prod.id] || 'Otros',
      price: prod.precio
    });

    sleep(1.5);

    // 4. Intentar Compra
    logBusinessEvent('order_attempted', {
      user_id: userId,
      product_id: prod.id,
      product_name: prod.nombre,
      price: prod.precio
    });

    const startOrder = Date.now();
    const orderRes = http.post(
      `${BASE_URL}/api/ordenes`,
      JSON.stringify({ usuario_id: userId, producto_id: prod.id }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    const orderLatency = Date.now() - startOrder;

    if (orderRes.status === 200) {
      const orderData = JSON.parse(orderRes.body);
      logBusinessEvent('order_completed', {
        user_id: userId,
        product_id: prod.id,
        product_name: prod.nombre,
        price: prod.precio,
        quantity: 1,
        status: 'success',
        latency_ms: orderLatency
      });
    } else {
      const errMsg = orderRes.json('detail') || 'unknown_error';
      logBusinessEvent('order_failed', {
        user_id: userId,
        product_id: prod.id,
        product_name: prod.nombre,
        price: prod.precio,
        status: errMsg.includes('stock') ? 'out_of_stock' : 'infra_error',
        error_type: errMsg,
        latency_ms: orderLatency
      });
    }
  }
}

// 3. Flujo Compulsivo: Compra de artículos de alta demanda (Tarjeta Gráfica RTX 4090 - ID: 1)
// Esto generará rápidamente agotamiento de stock y disparará errores de negocio controlados.
export function flujoCompulsivo() {
  // Usar uno de los usuarios semilla para acelerar la compra o registrar uno nuevo
  const seedUserId = Math.floor(Math.random() * 2) + 1; // 1 o 2

  // Navega directamente al producto de alta demanda (ID 1: RTX 4090)
  logBusinessEvent('product_viewed', {
    user_id: seedUserId,
    product_id: 1,
    product_name: 'Tarjeta Gráfica RTX 4090',
    category: 'Componentes',
    price: 1600.0
  });

  sleep(0.5);

  logBusinessEvent('order_attempted', {
    user_id: seedUserId,
    product_id: 1,
    product_name: 'Tarjeta Gráfica RTX 4090',
    price: 1600.0
  });

  const startOrder = Date.now();
  const orderRes = http.post(
    `${BASE_URL}/api/ordenes`,
    JSON.stringify({ usuario_id: seedUserId, producto_id: 1 }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const orderLatency = Date.now() - startOrder;

  if (orderRes.status === 200) {
    logBusinessEvent('order_completed', {
      user_id: seedUserId,
      product_id: 1,
      product_name: 'Tarjeta Gráfica RTX 4090',
      price: 1600.0,
      quantity: 1,
      status: 'success',
      latency_ms: orderLatency
    });
  } else {
    const errMsg = orderRes.json('detail') || 'unknown_error';
    logBusinessEvent('order_failed', {
      user_id: seedUserId,
      product_id: 1,
      product_name: 'Tarjeta Gráfica RTX 4090',
      price: 1600.0,
      status: errMsg.includes('stock') ? 'out_of_stock' : 'infra_error',
      error_type: errMsg,
      latency_ms: orderLatency
    });
  }

  sleep(0.5);
}
