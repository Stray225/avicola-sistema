'use strict';
// Tests de recompra, botón Copiar, avisos de publicidad y tablero (funciones puras de Logica.gs).
// Todos los datos son inventados.
var test = require('node:test');
var assert = require('node:assert/strict');
var vm = require('node:vm');
var modulo = require('../apps-script/Logica.gs');
var L = modulo.Logica;

var CATALOGO = L.armarCatalogo({
  costos: [
    { codigo: 'H-B1', producto: 'Huevo blanco', unidadBase: 'maple', costo: 5000, categoria: 'Huevos' },
    { codigo: 'Q-FRESCO', producto: 'Queso fresco', unidadBase: 'kg', costo: 6000, categoria: 'Quesos' },
    { codigo: 'G-MED', producto: 'Medallón', unidadBase: 'kg', costo: 3000, categoria: 'Congelados' }
  ],
  precios: [
    { codigo: 'H-B1', nombre: 'Huevo blanco', unidad: 'maple', precio: 7000 },
    { codigo: 'Q-FRESCO', nombre: 'Queso fresco', unidad: 'kg', precio: 9000 },
    { codigo: 'G-MED', nombre: 'Medallón', unidad: 'kg', precio: 4000 }
  ],
  promos: [{ codigo: 'PROMO-1', nombre: 'PROMO 1', precio: 10000, activa: 'sí' }],
  composicion: [{ promo: 'PROMO-1', codigo: 'H-B1', cantidad: 1 }, { promo: 'PROMO-1', codigo: 'G-MED', cantidad: 0.5 }]
});

var CFG = {
  porcentajeAgustin: 0.7,
  horaCorte: '11:30',
  diasSinReparto: [],
  cicloPorDefecto: 14,
  diasSinRepetir: 7,
  diasParaMedir: 7,
  topeMensajes: 15,
  nombresDireccion: ['calle', 'av', 'avenida', 'entre'],
  mensajeRecompraGeneral: '¡Hola {nombre}! La otra vez te llevé {ultima_compra}. ¿Te alcanzo algo {dia_reparto}? Agus de Llegamos',
  mensajeRecompraAntes: '¡Hola {nombre}! Soy Agus de Llegamos. ¿Te llevo algo {dia_reparto}?',
  mensajesRecompra: [
    { para: 'PROMO 1', clave: 'promo1', texto: '¿Otra PROMO 1, {nombre}? Te la llevo {dia_reparto}.' },
    { para: 'Huevos', clave: 'huevos', texto: '¡Hola {nombre}! ¿Huevos {dia_reparto}?' }
  ],
  origenesAnuncio: ['Anuncio'],
  semanasTablero: 3,
  semanasDetalle: 2,
  diasActivo: 30,
  diasPerdido: 60
};

function entregado(id, tel, fecha, lineas, extra) {
  return Object.assign({ id: id, telefono: tel, fechaEntrega: fecha, fechaCarga: fecha + ' 08:00:00', estado: 'entregado',
    totalCobrado: 7000, envio: 0, costo: 5000, detalle: '', lineas: lineas || [] }, extra || {});
}

var HB1 = [{ codigo: 'H-B1', cantidad: 2, precioUnitario: 7000, costoUnitario: 5000 }];

test('botón Copiar: el número para pegar en otro teléfono y el mensaje abajo', function () {
  assert.equal(L.formatearTelefonoInternacional('+5491155550001', '11'), '+54 9 11 5555-0001');
  assert.equal(L.textoParaCopiar('+5491155550001', '¡Hola Ana!', '11'), '+54 9 11 5555-0001\n¡Hola Ana!');
  assert.equal(L.textoParaCopiar('+5491155550001', '', '11'), '+54 9 11 5555-0001');
});

test('nombres que en realidad son direcciones: saludo sin nombre', function () {
  var palabras = CFG.nombresDireccion;
  assert.ok(L.pareceDireccion('Calle 14 1234', palabras));
  assert.ok(L.pareceDireccion('Av. Mitre', palabras));
  assert.ok(L.pareceDireccion('av mitre', palabras));
  assert.ok(L.pareceDireccion('Entre 13 y 14', palabras));
  assert.ok(L.pareceDireccion('Mitre 450', palabras)); // tiene números
  assert.ok(!L.pareceDireccion('Avril', palabras)); // empieza con "av" pero es un nombre
  assert.ok(!L.pareceDireccion('María José', palabras));
  assert.equal(L.nombreParaSaludo('María José', palabras), 'María');
  assert.equal(L.nombreParaSaludo('Calle 14 1234', palabras), '');
  assert.equal(L.completarMensaje('¡Hola {nombre}! ¿Todo bien?', { nombre: '' }), '¡Hola! ¿Todo bien?');
  assert.equal(L.completarMensaje('¡Hola, {nombre}!', { nombre: '' }), '¡Hola!');
});

test('fechas por semana (de lunes a domingo)', function () {
  assert.equal(L.lunesDe('2026-10-05'), '2026-10-05'); // lunes
  assert.equal(L.lunesDe('2026-10-11'), '2026-10-05'); // domingo: es de la semana que empezó el lunes
  assert.equal(L.lunesDe('2026-10-14'), '2026-10-12');
  assert.equal(L.lunesDe('2026-11-01'), '2026-10-26');
  assert.equal(L.diasEntre('2026-09-30', '2026-10-05'), 5);
  assert.equal(L.diasEntre('2026-10-05', '2026-09-30'), -5);
  assert.equal(L.diasEntre('', '2026-10-05'), null);
  assert.equal(L.fechaDeSello('2026-10-05 10:30:00'), '2026-10-05');
  assert.equal(L.fechaDeSello('cualquier cosa'), '');
  assert.equal(L.nombreSemana('2026-10-05'), 'lun 5/10 al dom 11/10');
});

test('mensaje según lo último que compró: promo, después categoría, después el general', function () {
  assert.equal(L.elegirPlantillaRecompra([{ codigo: 'PROMO-1', cantidad: 1, precioUnitario: 10000 }], CATALOGO, CFG), 'promo1');
  // Aunque los huevos pesen más, si hay una promo con mensaje propio va el de la promo.
  assert.equal(L.elegirPlantillaRecompra([{ codigo: 'H-B1', cantidad: 3, precioUnitario: 7000 }, { codigo: 'PROMO-1', cantidad: 1, precioUnitario: 10000 }], CATALOGO, CFG), 'promo1');
  assert.equal(L.elegirPlantillaRecompra(HB1, CATALOGO, CFG), 'huevos');
  assert.equal(L.elegirPlantillaRecompra([{ codigo: 'Q-FRESCO', cantidad: 1, precioUnitario: 9000 }], CATALOGO, CFG), 'general');
  assert.equal(L.textoPlantillaRecompra('huevos', CFG), '¡Hola {nombre}! ¿Huevos {dia_reparto}?');
  assert.equal(L.textoPlantillaRecompra('general', CFG), CFG.mensajeRecompraGeneral);
  assert.equal(L.textoPlantillaRecompra('antes', CFG), CFG.mensajeRecompraAntes);
  assert.equal(L.textoPlantillaRecompra('antes', Object.assign({}, CFG, { mensajeRecompraAntes: '' })), CFG.mensajeRecompraGeneral);
});

// ───────── Clientes de prueba para RECOMPRA (hoy: miércoles 14/10/2026) ─────────
var HOY = '2026-10-14';
var CLIENTES = [
  { telefono: '+5491155550001', nombre: 'Ana', barrio: 'Hudson' },
  { telefono: '+5491155550002', nombre: 'Beto' },
  { telefono: '+5491155550003', nombre: 'Caro' },
  { telefono: '+5491155550004', nombre: 'Calle 14 1234' },
  { telefono: '+5491155550005', nombre: 'Dani' },
  { telefono: '+5491155550006', nombre: 'Eli', noEscribir: 'sí' },
  { telefono: '+5491155550007', nombre: 'Fede' },
  { telefono: '11 555', nombre: 'Gabi' },
  { telefono: '+5491155550008', nombre: 'Hugo' },
  { telefono: '+5491155550009', nombre: 'Ivi' },
  { telefono: '+5491155550012', nombre: 'Juli' }
];
var PEDIDOS = [
  entregado('A1', '+5491155550001', '2026-09-20', HB1, { detalle: '2 maples Huevo blanco', barrio: 'Hudson' }),
  entregado('A2', '+5491155550001', '2026-09-30', HB1, { detalle: '2 maples Huevo blanco' }),
  entregado('B1', '+5491155550002', '2026-10-10', [{ codigo: 'PROMO-1', cantidad: 1, precioUnitario: 10000 }], { totalCobrado: 10000 }),
  entregado('C1', '+5491155550003', '2026-09-01', HB1),
  { id: 'C2', telefono: '+5491155550003', fechaEntrega: '2026-10-15', fechaCarga: '2026-10-13 10:00:00', estado: 'confirmado', lineas: HB1 },
  entregado('D1', '+5491155550004', '2026-09-15', [{ codigo: 'Q-FRESCO', cantidad: 1, precioUnitario: 9000 }], { totalCobrado: 9000, detalle: '1 kg Queso fresco' }),
  entregado('E1', '+5491155550006', '2026-09-01', HB1),
  { id: 'F1', telefono: '+5491155550007', fechaEntrega: '2026-10-01', fechaCarga: '2026-09-30 10:00:00', estado: 'cancelado', lineas: HB1 },
  // Juli es nueva: su primer pedido todavía no tiene fecha de entrega. No es "de antes" ni entra todavía.
  { id: 'J1', telefono: '+5491155550012', fechaEntrega: '', fechaCarga: '2026-10-13 10:00:00', estado: 'confirmado', lineas: HB1 }
];
// Ivi: 6 compras, una por semana (ciclo 7).
['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22', '2026-08-29', '2026-09-05'].forEach(function (f, i) {
  PEDIDOS.push(entregado('I' + i, '+5491155550009', f, HB1, { totalCobrado: 14000 }));
});

function fichas() { return L.fichasRecompra({ clientes: CLIENTES, pedidos: PEDIDOS, catalogo: CATALOGO, config: CFG }); }
function porTel(lista, tel) { return lista.filter(function (f) { return f.telefono === tel; })[0]; }

test('RECOMPRA: quién entra, ciclo, última compra y clientes de antes', function () {
  var f = fichas();
  assert.deepEqual(f.map(function (x) { return x.nombre; }).sort(), ['Ana', 'Beto', 'Calle 14 1234', 'Caro', 'Dani', 'Hugo', 'Ivi']);
  // Eli: "No escribir". Fede: solo un pedido cancelado. Gabi: teléfono a medias. Juli: pedido sin fecha, todavía sin compras.
  var ana = porTel(f, '+5491155550001');
  assert.equal(ana.tipo, 'recompra');
  assert.equal(ana.ciclo, 10); // del 20/9 al 30/9
  assert.equal(ana.ultimaCompra, '2026-09-30');
  assert.equal(ana.cantidadCompras, 2);
  assert.equal(ana.totalGastado, 14000);
  assert.equal(ana.detalle, '2 maples Huevo blanco');
  assert.equal(ana.plantilla, 'huevos');
  assert.equal(ana.barrio, 'Hudson');
  assert.equal(porTel(f, '+5491155550002').ciclo, 14); // una sola compra: el de CONFIG
  assert.equal(porTel(f, '+5491155550002').plantilla, 'promo1');
  assert.equal(porTel(f, '+5491155550003').enCurso, true);
  assert.equal(porTel(f, '+5491155550009').ciclo, 7);
  var dani = porTel(f, '+5491155550005');
  assert.equal(dani.tipo, 'cliente de antes');
  assert.equal(dani.ciclo, null);
  assert.equal(dani.plantilla, 'antes');
  assert.equal(porTel(f, '+5491155550004').plantilla, 'general'); // queso: no hay mensaje para Quesos
});

test('RECOMPRA: a quién le toca hoy, prioridad, orden y tope', function () {
  var envios = [{ telefono: '+5491155550008', fecha: '2026-10-01 09:00:00' }]; // a Hugo le escribió y no respondió
  var r = L.ordenarRecompra({ hoy: HOY, fichas: fichas(), envios: envios, config: CFG });
  var nombres = r.filas.map(function (x) { return x.nombre; });
  // Primero los que tocan, por puntos: Ivi y Dani (100; Ivi gastó más), Ana 90, Hugo 70, Calle 14 60. Después Beto (faltan días) y Caro (pedido en curso).
  assert.deepEqual(nombres, ['Ivi', 'Dani', 'Ana', 'Hugo', 'Calle 14 1234', 'Beto', 'Caro']);
  var x = {};
  r.filas.forEach(function (f) { x[f.nombre] = f; });
  assert.equal(x.Ivi.puntos, 100); // 50 + 10 × 5 (tope de 5 compras)
  assert.equal(x.Ivi.prioridad, 'Alta');
  assert.equal(x.Dani.prioridad, 'Alta'); // cliente de antes
  assert.equal(x.Ana.puntos, 90); // 50 + 20 + 20 (pasó su ciclo hace poco)
  assert.equal(x.Ana.diasDesde, 14);
  assert.equal(x.Hugo.puntos, 70); // cliente de antes con un mensaje sin respuesta
  assert.equal(x.Hugo.sinRespuesta, 1);
  assert.equal(x['Calle 14 1234'].prioridad, 'Media');
  assert.equal(x.Beto.estado, 'Faltan 10 días');
  assert.equal(x.Caro.estado, 'Tiene un pedido en curso');
  assert.equal(r.lista.length, 5);
  assert.equal(x.Ana.estado, 'Escribir hoy');
  assert.equal(x.Ana.posicion, 3);

  // Tope: 3 por día y ya se le escribió a uno hoy (aunque no esté en la lista) → quedan 2.
  var tope = L.ordenarRecompra({ hoy: HOY, fichas: fichas(), config: Object.assign({}, CFG, { topeMensajes: 3 }),
    envios: envios.concat([{ telefono: '+5491155550099', fecha: HOY + ' 08:30:00' }]) });
  assert.equal(tope.escritosHoy, 1);
  assert.deepEqual(tope.lista.map(function (f) { return f.nombre; }), ['Ivi', 'Dani']);
  assert.equal(tope.pasanTope, 3);
  assert.equal(porTel(tope.filas, '+5491155550001').estado, 'Toca, pero pasó el tope de hoy');

  // Le escribió a Ana hoy: sale de la lista de hoy y no vuelve hasta dentro de 7 días.
  var hoyAna = L.ordenarRecompra({ hoy: HOY, fichas: fichas(), envios: [{ telefono: '+5491155550001', fecha: HOY + ' 10:00:00' }], config: CFG });
  assert.equal(porTel(hoyAna.filas, '+5491155550001').estado, 'Le escribiste hoy');
  assert.equal(porTel(hoyAna.filas, '+5491155550001').toca, false);
  var seisDias = L.ordenarRecompra({ hoy: '2026-10-20', fichas: fichas(), envios: [{ telefono: '+5491155550001', fecha: HOY + ' 10:00:00' }], config: CFG });
  assert.equal(porTel(seisDias.filas, '+5491155550001').estado, 'Le escribiste hace 6 días');
  var sieteDias = L.ordenarRecompra({ hoy: '2026-10-21', fichas: fichas(), envios: [{ telefono: '+5491155550001', fecha: HOY + ' 10:00:00' }], config: CFG });
  assert.equal(porTel(sieteDias.filas, '+5491155550001').toca, true);
  assert.equal(porTel(sieteDias.filas, '+5491155550001').sinRespuesta, 0); // el 21/10 todavía cuenta (14/10 + 7)

  // "No escribir" marcado desde el celu.
  var sinIvi = fichas().map(function (f) { if (f.nombre === 'Ivi') f.noEscribir = true; return f; });
  assert.ok(!L.ordenarRecompra({ hoy: HOY, fichas: sinIvi, envios: [], config: CFG }).filas.some(function (f) { return f.nombre === 'Ivi'; }));
});

test('RECOMPRA: si después del mensaje cargó un pedido, el mensaje no resta', function () {
  var envios = [{ telefono: '+5491155550001', fecha: '2026-10-01 09:00:00' }];
  var sinPedido = L.ordenarRecompra({ hoy: HOY, fichas: fichas(), envios: envios, config: CFG });
  assert.equal(porTel(sinPedido.filas, '+5491155550001').sinRespuesta, 1);
  // Pidió el 3/10 (todavía sin entregar): el mensaje tuvo respuesta y tiene un pedido en curso.
  var pedidos = PEDIDOS.concat([{ id: 'A3', telefono: '+5491155550001', fechaEntrega: '2026-10-20', fechaCarga: '2026-10-03 10:00:00', estado: 'confirmado', lineas: HB1 }]);
  var f = L.fichasRecompra({ clientes: CLIENTES, pedidos: pedidos, catalogo: CATALOGO, config: CFG });
  assert.equal(porTel(f, '+5491155550001').ultimaCarga, '2026-10-03 10:00:00');
  var fila = porTel(L.ordenarRecompra({ hoy: HOY, fichas: f, envios: envios, config: CFG }).filas, '+5491155550001');
  assert.equal(fila.sinRespuesta, 0);
  assert.equal(fila.estado, 'Tiene un pedido en curso');
  // Un cliente de antes que ya hizo un pedido deja de ser "de antes": entra cuando lo reciba.
  var hugo = PEDIDOS.concat([{ id: 'H1', telefono: '+5491155550008', fechaEntrega: '2026-10-20', fechaCarga: '2026-10-03 10:00:00', estado: 'confirmado', lineas: HB1 }]);
  assert.equal(porTel(L.fichasRecompra({ clientes: CLIENTES, pedidos: hugo, catalogo: CATALOGO, config: CFG }), '+5491155550008'), undefined);
});

test('RECOMPRA: el mensaje armado ({nombre}, {ultima_compra}, {dia_reparto})', function () {
  var f = fichas();
  var ana = porTel(f, '+5491155550001');
  assert.equal(L.mensajeRecompra(ana, CFG, HOY, '09:00'), '¡Hola Ana! ¿Huevos hoy?');
  assert.equal(L.mensajeRecompra(ana, CFG, HOY, '12:00'), '¡Hola Ana! ¿Huevos mañana?'); // pasó la hora de corte
  assert.equal(L.mensajeRecompra(ana, CFG, '2026-10-17', '12:00'), '¡Hola Ana! ¿Huevos el lunes 19/10?'); // sábado a la tarde
  var calle = porTel(f, '+5491155550004');
  assert.equal(L.mensajeRecompra(calle, CFG, HOY, '09:00'),
    '¡Hola! La otra vez te llevé 1 kg Queso fresco. ¿Te alcanzo algo hoy? Agus de Llegamos');
  assert.equal(L.mensajeRecompra(porTel(f, '+5491155550005'), CFG, HOY, '09:00'), '¡Hola Dani! Soy Agus de Llegamos. ¿Te llevo algo hoy?');
  assert.equal(L.mensajeRecompra(ana, Object.assign({}, CFG, { mensajesRecompra: [], mensajeRecompraGeneral: '' }), HOY, '09:00'), '');
});

test('RECOMPRA: ¿volvió a comprar? (dentro de N días después del mensaje)', function () {
  var envio = { fecha: '2026-10-05 10:00:00' };
  var antes = { id: 'X0', estado: 'entregado', fechaCarga: '2026-10-05 09:00:00' };
  var cancelado = { id: 'X1', estado: 'cancelado', fechaCarga: '2026-10-06 09:00:00' };
  var bueno = { id: 'X2', estado: 'confirmado', fechaCarga: '2026-10-08 18:00:00' };
  var tarde = { id: 'X3', estado: 'entregado', fechaCarga: '2026-10-13 09:00:00' };
  assert.deepEqual(L.resultadoMensaje(envio, [antes, cancelado, bueno, tarde], '2026-10-14', 7), { resultado: 'Volvió a comprar', pedido: 'X2', fechaPedido: '2026-10-08' });
  assert.equal(L.resultadoMensaje(envio, [antes, cancelado], '2026-10-12', 7).resultado, 'Esperando'); // el 12/10 todavía está a tiempo
  assert.equal(L.resultadoMensaje(envio, [antes, cancelado, tarde], '2026-10-13', 7).resultado, 'Sin respuesta');
  assert.equal(L.resultadoMensaje(envio, [], '2026-10-06', 7).resultado, 'Esperando');
  // Columnas de RECOMPRA: tildada mientras no se le pueda volver a escribir; después, cómo salió.
  var activa = L.columnasMensajeRecompra({ ultimoEnvio: '2026-10-05 10:00:00', escribioHace: 2 }, [], '2026-10-07', CFG);
  assert.deepEqual(activa, { leEscribi: true, leEscribiEl: '2026-10-05 10:00:00', resultado: 'Esperando' });
  assert.equal(L.columnasMensajeRecompra({ ultimoEnvio: '2026-10-05 10:00:00', escribioHace: 4 }, [bueno], '2026-10-09', CFG).resultado, 'Volvió a comprar');
  var vieja = L.columnasMensajeRecompra({ ultimoEnvio: '2026-10-05 10:00:00', escribioHace: 9 }, [], '2026-10-14', CFG);
  assert.deepEqual(vieja, { leEscribi: false, leEscribiEl: '', resultado: 'Sin respuesta (mensaje del 05/10)' });
  assert.deepEqual(L.columnasMensajeRecompra({ ultimoEnvio: '' }, [], HOY, CFG), { leEscribi: false, leEscribiEl: '', resultado: '' });
});

test('origen sugerido "Recompra": le escribiste en los últimos N días', function () {
  var envios = [{ telefono: '+5491155550001', fecha: '2026-10-05 10:00:00' }, { telefono: '+5491155550001', fecha: '2026-09-01 10:00:00' }];
  assert.equal(L.mensajeReciente('+5491155550001', envios, '2026-10-12', 7), '2026-10-05');
  assert.equal(L.mensajeReciente('+5491155550001', envios, '2026-10-13', 7), '');
  assert.equal(L.mensajeReciente('+5491155550002', envios, '2026-10-06', 7), '');
});

test('publicidad cargada en GASTOS: aviso para no contarla dos veces', function () {
  var palabras = ['publicidad', 'anuncio', 'Meta'];
  assert.ok(L.esGastoDePublicidad('Publicidad Instagram', palabras));
  assert.ok(L.esGastoDePublicidad('anuncios de la semana', palabras));
  assert.ok(L.esGastoDePublicidad('Pago a META', palabras));
  assert.ok(!L.esGastoDePublicidad('Metalúrgica', palabras));
  assert.ok(!L.esGastoDePublicidad('Nafta', palabras));
  var avisos = L.avisosGastosPublicidad([
    { id: 'G1', fecha: '2026-10-05', descripcion: 'Nafta', monto: 2000 },
    { id: 'G2', fecha: '2026-10-05', descripcion: 'Anuncio Meta', monto: '5.000' }
  ], palabras);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].tipo, 'Publicidad en GASTOS');
  assert.equal(avisos[0].codigo, 'G2');
  assert.equal(avisos[0].nombre, 'Anuncio Meta · 05/10/2026 · $ 5.000');
  assert.match(avisos[0].detalle, /GASTO_META/);
});

// ───────── Tablero (hoy: miércoles 14/10; semanas 12/10, 5/10 y 28/9) ─────────
function datosTablero() {
  var promo1 = function (cant, precio) { return [{ codigo: 'PROMO-1', cantidad: cant, precioUnitario: precio, costoUnitario: 6000 }]; };
  return {
    hoy: HOY,
    config: CFG,
    catalogo: CATALOGO,
    clientes: [
      { telefono: '+5491155550001' }, { telefono: '+5491155550002' }, { telefono: '+5491155550005', deAntes: 'sí' },
      { telefono: '+5491155550007' }, { telefono: '+5491155550008', deAntes: 'sí' }, { telefono: '+5491155550010' }, { telefono: '+5491155550011' }
    ],
    pedidos: [
      entregado('P1', '+5491155550001', '2026-10-06', promo1(1, 10000), { totalCobrado: 10000, costo: 6000, origen: 'Anuncio PROMO FULL', barrio: 'Hudson' }),
      entregado('P2', '+5491155550001', '2026-10-13', HB1, { totalCobrado: 7000, costo: 5000, barrio: 'Hudson' }),
      entregado('P3', '+5491155550002', '2026-10-07', HB1, { totalCobrado: 8000, envio: 500, costo: 5000, origen: 'Pedix', barrio: 'hudson', fechaCarga: '2026-10-06 09:00:00' }),
      entregado('P4', '+5491155550005', '2026-10-08', promo1(2, 10000), { totalCobrado: 18000, costo: 12000, barrio: 'Ranelagh' }),
      entregado('P5', '', '2026-10-09', [], { totalCobrado: 2000, costo: 1000, barrio: '' }),
      entregado('P6', '+5491155550007', '2026-09-30', HB1, { totalCobrado: 5000, costo: 3000, origen: 'Anuncio otra promo' }),
      entregado('P7', '+5491155550010', '2026-08-20', HB1),
      entregado('P8', '+5491155550011', '2026-07-01', HB1),
      { id: 'P9', telefono: '+5491155550003', fechaEntrega: '2026-10-06', estado: 'cancelado', totalCobrado: 99999, costo: 1 },
      { id: 'P10', telefono: '+5491155550004', fechaEntrega: '2026-10-13', estado: 'confirmado', totalCobrado: 99999, costo: 1 }
    ],
    gastos: [
      { fecha: '2026-10-06', descripcion: 'Nafta', monto: 1000, quienPaga: 'lo paga el local' },
      { fecha: '2026-10-07', descripcion: 'Bolsas', monto: 500, quienPaga: 'se reparte entre los dos' },
      { fecha: '2026-10-13', descripcion: 'Nafta', monto: 800, quienPaga: '' }
    ],
    gastoMeta: [{ semana: '2026-10-05', monto: 3000 }, { semana: '2026-10-08', monto: '1.000' }, { semana: '2026-10-12', monto: 2000 }],
    envios: [{ telefono: '+5491155550002', fecha: '2026-10-05 10:00:00' }, { telefono: '+5491155550008', fecha: '2026-10-06 10:00:00' }]
  };
}

test('TABLERO: números por semana, de lunes a domingo', function () {
  var r = L.calcularTablero(datosTablero());
  assert.deepEqual(r.semanas.map(function (s) { return s.lunes; }), ['2026-10-12', '2026-10-05', '2026-09-28']);
  assert.equal(r.semanas[0].enCurso, true);
  assert.equal(r.semanas[0].nombre, 'lun 12/10 al dom 18/10');
  var s = r.semanas[1];
  assert.equal(s.pedidos, 4); // no cuentan el cancelado ni el confirmado
  assert.equal(s.ventas, 10000 + 8500 + 18000 + 2000);
  assert.equal(s.costo, 6000 + 5000 + 12000 + 1000);
  assert.equal(s.ganancia, 14500);
  assert.equal(s.nuevos, 2); // Ana y Beto (Dani es cliente de antes)
  assert.equal(s.nuevosAnuncio, 1); // Ana vino por un anuncio
  assert.equal(s.repitieron, 1);
  assert.equal(s.porcentajeRepite, Number((6000 / 14500).toFixed(6)));
  assert.equal(s.mensajes, 2);
  assert.equal(s.volvieron, 1); // Beto pidió al día siguiente; Hugo no
  assert.equal(s.porcentajeVolvio, 0.5);
  assert.equal(s.meta, 4000); // la fila del jueves 8/10 también es de esa semana
  assert.equal(s.costoPorNuevo, 4000);
  assert.equal(s.agustin, 10150);
  assert.equal(s.local, 4350);
  assert.equal(s.gastosLocal, 1000 + 150); // la nafta y su 30% de las bolsas
  assert.equal(s.leQuedaLocal, 4350 - 1150 - 4000);
  var actual = r.semanas[0];
  assert.equal(actual.ganancia, 2000);
  assert.equal(actual.repitieron, 1);
  assert.equal(actual.porcentajeRepite, 1);
  assert.equal(actual.nuevos, 0);
  assert.equal(actual.costoPorNuevo, null); // sin clientes nuevos no se puede dividir
  assert.equal(actual.leQuedaLocal, 600 - 800 - 2000);
  assert.equal(r.semanas[2].nuevosAnuncio, 1);
  assert.equal(r.semanas[2].costoPorNuevo, 0);
});

test('TABLERO: por promo, por barrio y clientes activos, en riesgo y perdidos', function () {
  var r = L.calcularTablero(datosTablero());
  assert.equal(r.detalle.desde, '2026-10-05');
  assert.equal(r.detalle.semanas, 2);
  // PROMO 1: 1 en P1 y 2 en P4 (P4 se cobró $ 18.000 en vez de $ 20.000: la diferencia se reparte).
  assert.deepEqual(r.detalle.promos, [{ codigo: 'PROMO-1', nombre: 'PROMO 1', unidades: 3, ganancia: 4000 + 6000,
    compradores: 2, volvieron: 1, porcentajeVolvio: 0.5 }]);
  assert.deepEqual(r.detalle.barrios, [
    { barrio: 'Hudson', pedidos: 3, ganancia: 4000 + 2000 + 3500 },
    { barrio: 'Ranelagh', pedidos: 1, ganancia: 6000 },
    { barrio: '(sin barrio)', pedidos: 1, ganancia: 1000 }
  ]);
  assert.deepEqual(r.clientes, { activos: 4, enRiesgo: 1, perdidos: 1, sinCompras: 1 });
  var corto = L.calcularTablero(Object.assign(datosTablero(), { semanas: 2, sinDetalle: true }));
  assert.equal(corto.semanas.length, 2);
  assert.equal(corto.detalle, undefined);
});

test('la lógica nueva también anda copiada en la web app', function () {
  var copia = vm.runInNewContext('(' + modulo.crearLogica_.toString() + ')()', { Intl: Intl });
  var f = copia.fichasRecompra({ clientes: CLIENTES, pedidos: PEDIDOS, catalogo: CATALOGO, config: CFG });
  var r = copia.ordenarRecompra({ hoy: HOY, fichas: f, envios: [], config: CFG });
  assert.equal(r.lista[0].nombre, 'Ivi');
  assert.equal(copia.textoParaCopiar('+5491155550001', 'Hola', '11'), '+54 9 11 5555-0001\nHola');
});
