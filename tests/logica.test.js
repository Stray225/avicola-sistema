'use strict';
// Tests de las funciones puras de Logica.gs. Todos los datos son inventados.
var test = require('node:test');
var assert = require('node:assert/strict');
var vm = require('node:vm');
var modulo = require('../apps-script/Logica.gs');
var L = modulo.Logica;

// ───────── Catálogo de prueba (costos y precios inventados) ─────────
var COSTOS = [
  { codigo: 'H-B1', producto: 'Huevo blanco N°1', unidadBase: 'maple', costo: '$5.000,00', categoria: 'Huevos' },
  { codigo: 'H-B2', producto: 'Huevo blanco N°2', unidadBase: 'maple', costo: 4500, categoria: 'Huevos' },
  { codigo: 'G-MED', producto: 'Medallón de pollo', unidadBase: 'kg', costo: '3.000', categoria: 'Congelados' },
  { codigo: 'G-PAT', producto: 'Patitas de pollo', unidadBase: 'kg', costo: 2800, categoria: 'Congelados' },
  { codigo: 'P-BAST', producto: 'Bastoncitos', unidadBase: 'kg', costo: 3500, categoria: 'Congelados' },
  { codigo: 'Q-FRESCO', producto: 'Queso fresco', unidadBase: 'kg', costo: '6.000', categoria: 'Quesos' },
  { codigo: 'A-HAR', producto: 'Harina 000', unidadBase: 'unidad', costo: 800, categoria: 'Almacén' },
  { codigo: 'A-RAL', producto: 'Rallado', unidadBase: 'unidad', costo: '', categoria: 'Almacén' }
];
var PRECIOS = [
  { codigo: 'H-B1', nombre: 'Huevo B1', unidad: 'maple', precio: 7000, base: '', paso: 1, activo: 'sí' },
  { codigo: 'H-B2', nombre: 'Huevo B2', unidad: 'maple', precio: '', base: '', paso: 1, activo: 'sí' },
  { codigo: 'Q-FRESCO', nombre: 'Queso fresco', unidad: 'kg', precio: '$ 9.000', base: '', paso: '0,5', activo: '' },
  { codigo: 'A-HAR', nombre: 'Harina', unidad: 'unidad', precio: 1000, base: '', paso: '', activo: 'sí' },
  { codigo: 'A-RAL', nombre: 'Rallado', unidad: 'unidad', precio: 1500, base: '', paso: '', activo: 'sí' },
  { codigo: 'G-MED', nombre: 'Medallones', unidad: 'kg', precio: 3100, base: '', paso: '', activo: 'sí' },
  { codigo: 'H-SUELTO', nombre: 'Huevo suelto', unidad: 'unidad', precio: 300, base: '', paso: '', activo: 'no' }
];
var PROMOS = [
  { codigo: 'PROMO-1', nombre: 'PROMO 1', precio: 20000, activa: 'sí', revisar: 'a revisar' },
  { codigo: 'PROMO-X', nombre: 'Promo sin costo', precio: 9000, activa: 'sí', revisar: '' }
];
var COMPOSICION = [
  { promo: 'PROMO-1', codigo: 'H-B2', cantidad: 1 },
  { promo: 'PROMO-1', codigo: 'G-MED', cantidad: 1 },
  { promo: 'promo 1', codigo: 'Q-FRESCO', cantidad: '0,5' },
  { promo: 'PROMO-X', codigo: 'A-RAL', cantidad: 2 }
];
function catalogo() {
  return L.armarCatalogo({ costos: COSTOS, precios: PRECIOS, promos: PROMOS, composicion: COMPOSICION });
}

test('montos con formato argentino, dictados y raros', function () {
  assert.equal(L.parsearMonto('$5.000,00'), 5000);
  assert.equal(L.parsearMonto('$ 29.900'), 29900);
  assert.equal(L.parsearMonto('29900'), 29900);
  assert.equal(L.parsearMonto(29900), 29900);
  assert.equal(L.parsearMonto('1.234.567,89'), 1234567.89);
  assert.equal(L.parsearMonto('0,5'), 0.5);
  assert.equal(L.parsearMonto('0.5'), 0.5);
  assert.equal(L.parsearMonto('12.5'), 12.5);
  assert.equal(L.parsearMonto('30 mil'), 30000);
  assert.equal(L.parsearMonto('30mil'), 30000);
  assert.equal(L.parsearMonto('1,5 mil'), 1500);
  assert.equal(L.parsearMonto('30 lucas'), 30000);
  assert.equal(L.parsearMonto('2 mil 500'), 2500);
  assert.equal(L.parsearMonto('-$1.500'), -1500);
  assert.equal(L.parsearMonto('(1.500)'), -1500);
  assert.equal(L.parsearMonto('$29,900.00'), 29900);
  assert.equal(L.parsearMonto(''), null);
  assert.equal(L.parsearMonto('hola'), null);
  assert.equal(L.parsearMonto(null), null);
  assert.equal(L.parsearPesos('$ 1.234,56'), 1235);
  assert.equal(L.parsearPesos('$ 1.234,49'), 1234);
  assert.equal(L.parsearCantidad('-1'), null);
});

test('formato de pesos, cantidades y porcentajes', function () {
  assert.equal(L.formatearPesos(30000), '$ 30.000');
  assert.equal(L.formatearPesos(1234567), '$ 1.234.567');
  assert.equal(L.formatearPesos(-1500), '-$ 1.500');
  assert.equal(L.formatearPesos(0), '$ 0');
  assert.equal(L.formatearPesos(''), '');
  assert.equal(L.formatearCantidad(0.5), '0,5');
  assert.equal(L.formatearCantidad(2), '2');
  assert.equal(L.formatearPorcentaje(0.4123), '41,2%');
  assert.equal(L.parsearPorcentaje('70%'), 0.7);
  assert.equal(L.parsearPorcentaje(0.3), 0.3);
  assert.equal(L.parsearPorcentaje('30'), 0.3);
  assert.equal(L.parsearPorcentaje('0,7'), 0.7);
});

test('pesos enteros sin errores de coma flotante', function () {
  assert.equal(L.multiplicarPesos(4583, 0.3), 1375);
  assert.equal(L.multiplicarPesos(29900, 0.5), 14950);
  assert.equal(L.redondear(1374.9999999), 1375);
  assert.equal(L.redondear(-0.4), 0);
  assert.ok(Object.is(L.redondear(-0.4), 0));
});

test('70/30 sin perder un peso', function () {
  assert.deepEqual(L.repartir(10001, 0.7), { agustin: 7001, local: 3000 });
  assert.deepEqual(L.repartir(10000, 0.7), { agustin: 7000, local: 3000 });
  assert.deepEqual(L.repartir(-1000, 0.7), { agustin: -700, local: -300 });
  var r = L.repartir(33333, 0.7);
  assert.equal(r.agustin + r.local, 33333);
});

test('teléfonos: todas las formas llegan a +549 + 10 dígitos', function () {
  var esperado = '+5491155550001';
  ['+54 9 11 5555-0001', '+54 11 5555-0001', '+5411 5555 0001', '5411 5555 0001', '541155550001',
    '11 5555-0001', '1155550001', '15 5555-0001', '011 15 5555-0001', '+54 9 11 15 5555 0001', 5491155550001, '0054 9 11 5555 0001']
    .forEach(function (t) { assert.equal(L.normalizarTelefono(t, '11'), esperado, String(t)); });
  assert.equal(L.normalizarTelefono('15 5555-0001', ''), '');
  assert.equal(L.normalizarTelefono('1555550001', ''), '');
  assert.equal(L.normalizarTelefono('5555-0001', '11'), '');
  assert.equal(L.normalizarTelefono('11 555', '11'), '');
  assert.equal(L.normalizarTelefono('', '11'), '');
  assert.equal(L.normalizarTelefono('221 555 0001', '11'), '+5492215550001');
  assert.ok(L.telefonoValido('+5491155550001'));
  assert.ok(!L.telefonoValido('5491155550001'));
  assert.equal(L.primerTelefonoValido('11 5555 ::: +54 11 5555-0002', '11'), '+5491155550002');
  assert.equal(L.formatearTelefono('+5491155550001', '11'), '11 5555-0001');
});

test('teléfono adentro de un texto (planilla vieja)', function () {
  var r = L.extraerTelefono('Juana 11 5555-0003', '11');
  assert.equal(r.telefono, '+5491155550003');
  assert.equal(r.resto, 'Juana');
  var m = L.extraerTelefono('Pedro 11 5555', '11');
  assert.equal(m.telefono, '');
  assert.equal(m.incompleto, '11 5555');
  assert.equal(m.resto, 'Pedro');
  assert.equal(L.extraerTelefono('Sin nombre', '11').telefono, '');
});

test('mensajes y links de WhatsApp', function () {
  var msg = L.completarMensaje('¡Hola {nombre}! Total {total}. {otra}', { nombre: 'Ana', total: '$ 1.000' });
  assert.equal(msg, '¡Hola Ana! Total $ 1.000. {otra}');
  assert.equal(L.completarMensaje('¡Hola {nombre}!', { nombre: L.primerNombre('Sin nombre') }), '¡Hola!');
  assert.equal(L.primerNombre('María José Pérez'), 'María');
  var wa = L.linkWhatsapp('+5491155550001', 'Hola Ana 🚚', false);
  assert.equal(wa, 'https://wa.me/5491155550001?text=' + encodeURIComponent('Hola Ana 🚚'));
  var biz = L.linkWhatsapp('+5491155550001', 'Hola', true);
  assert.match(biz, /^intent:\/\/send\/\?phone=5491155550001&text=Hola#Intent;scheme=whatsapp;package=com\.whatsapp\.w4b;/);
  assert.match(biz, /S\.browser_fallback_url=https%3A%2F%2Fwa\.me%2F5491155550001/);
  assert.equal(L.linkWhatsapp('', 'Hola', false), '');
});

test('fechas: cuentas de calendario y formato', function () {
  assert.equal(L.sumarDias('2026-10-31', 1), '2026-11-01');
  assert.equal(L.sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(L.diaDeSemana('2026-10-05'), 1); // lunes
  assert.equal(L.diaDeSemana('2026-10-11'), 0); // domingo
  assert.equal(L.parsearFecha('05/10/2026'), '2026-10-05');
  assert.equal(L.parsearFecha('5/10', 2026), '2026-10-05');
  assert.equal(L.parsearFecha('5-10-26'), '2026-10-05');
  assert.equal(L.parsearFecha('2026-10-05'), '2026-10-05');
  assert.equal(L.parsearFecha('31/02/2026'), '');
  assert.equal(L.parsearFecha('cualquiera'), '');
  assert.equal(L.formatearFecha('2026-10-05'), '05/10/2026');
  assert.equal(L.formatearFechaCorta('2026-10-05'), 'lun 5/10');
  assert.equal(L.formatearFechaLarga('2026-10-05'), 'lunes 5 de octubre');
  assert.equal(L.fechaRelativa('2026-10-05', '2026-10-05'), 'hoy');
  assert.equal(L.fechaRelativa('2026-10-06', '2026-10-05'), 'mañana');
  assert.equal(L.fechaRelativa('2026-10-08', '2026-10-05'), 'el jueves 8/10');
  assert.equal(L.minutosDeHora('11:30'), 690);
  assert.equal(L.minutosDeHora('11.30'), 690);
  assert.equal(L.minutosDeHora('11:30 hs'), 690);
  assert.equal(L.minutosDeHora('11'), 660);
  assert.equal(L.minutosDeHora('25:00'), null);
});

test('hora de Buenos Aires explícita, sin importar la zona de la compu', function () {
  assert.deepEqual(L.partesFechaEnZona(new Date('2026-10-05T14:30:15Z')), { fecha: '2026-10-05', hora: '11:30', sello: '2026-10-05 11:30:15' });
  // 02:00 UTC del 6 todavía es el 5 a la noche en Argentina.
  assert.equal(L.partesFechaEnZona(new Date('2026-10-06T02:00:00Z')).fecha, '2026-10-05');
  assert.equal(L.partesFechaEnZona(new Date('2026-10-06T02:00:00Z')).hora, '23:00');
});

test('fecha de entrega por defecto: hora de corte, sábados, domingos y feriados', function () {
  // lunes 5/10/2026
  assert.equal(L.fechaEntregaPorDefecto('2026-10-05', '09:00', '11:30', []), '2026-10-05');
  assert.equal(L.fechaEntregaPorDefecto('2026-10-05', '11:29', '11:30', []), '2026-10-05');
  assert.equal(L.fechaEntregaPorDefecto('2026-10-05', '11:30', '11:30', []), '2026-10-06');
  // sábado antes del corte → sábado; después → lunes
  assert.equal(L.fechaEntregaPorDefecto('2026-10-10', '10:00', '11:30', []), '2026-10-10');
  assert.equal(L.fechaEntregaPorDefecto('2026-10-10', '12:00', '11:30', []), '2026-10-12');
  // domingo → lunes
  assert.equal(L.fechaEntregaPorDefecto('2026-10-11', '08:00', '11:30', []), '2026-10-12');
  // feriado el lunes 12 → martes 13
  assert.equal(L.fechaEntregaPorDefecto('2026-10-10', '12:00', '11:30', ['2026-10-12']), '2026-10-13');
  assert.equal(L.fechaEntregaPorDefecto('2026-10-12', '09:00', '11:30', ['2026-10-12']), '2026-10-13');
  // sin hora de corte cargada → día hábil siguiente
  assert.equal(L.fechaEntregaPorDefecto('2026-10-05', '09:00', '', []), '2026-10-06');
});

test('CONFIG: se lee por nombre de clave y con tipos', function () {
  var C = L.CLAVES_CONFIG;
  var cfg = L.interpretarConfig([
    [C.direccionLocal, 'Calle Falsa 123'],
    ['  porcentaje agustin ', '70%'],
    [C.margenMinimo, '20%'],
    [C.mediosPago, 'Efectivo, Mercado Pago, Transferencia'],
    [C.horaCorte, '11:30'],
    [C.umbralMayorista, '6'],
    [C.diasSinReparto, '12/10, 25/12/2026'],
    [C.caracteristica, '11'],
    [C.paradasPorLink, ''],
    [C.whatsappBusiness, 'Sí'],
    [C.mensajeAvisoVoy, 'Hola {nombre}'],
    [C.mensajeNoEstaba, 'No estabas']
  ], 2026);
  assert.equal(cfg.porcentajeAgustin, 0.7);
  assert.equal(cfg.porcentajeLocal, 0.3);
  assert.deepEqual(cfg.mediosPago, ['Efectivo', 'Mercado Pago', 'Transferencia']);
  assert.deepEqual(cfg.diasSinReparto, ['2026-10-12', '2026-12-25']);
  assert.equal(cfg.umbralMayorista, 6);
  assert.equal(cfg.paradasPorLink, 9);
  assert.equal(cfg.whatsappBusiness, true);
  assert.deepEqual(cfg.faltantes, []);
  var vacia = L.interpretarConfig([], 2026);
  assert.ok(vacia.faltantes.indexOf(C.direccionLocal) >= 0);
  var mal = L.interpretarConfig([[C.porcentajeAgustin, '70%'], [C.porcentajeLocal, '40%']], 2026);
  assert.equal(mal.avisos.length, 1);
});

test('catálogo: costos por unidad de venta, promos y costos faltantes', function () {
  var cat = catalogo();
  assert.equal(cat.porCodigo['H-B1'].costo, 5000);
  assert.equal(cat.porCodigo['H-B1'].maplesPorUnidad, 1);
  assert.equal(cat.porCodigo['Q-FRESCO'].precio, 9000);
  assert.equal(cat.porCodigo['Q-FRESCO'].paso, 0.5);
  assert.equal(cat.porCodigo['Q-FRESCO'].activo, true);
  assert.equal(cat.porCodigo['H-B2'].precio, null);
  assert.equal(cat.porCodigo['A-RAL'].costoFaltante, true);
  assert.equal(cat.porCodigo['H-SUELTO'].costoFaltante, true); // no está en COSTOS
  assert.equal(cat.porCodigo['H-SUELTO'].activo, false);
  // PROMO 1 = 1 H-B2 (4500) + 1 G-MED (3000) + 0,5 Q-FRESCO (3000) = 10500 (la composición acepta "promo 1")
  var p1 = cat.porCodigo['PROMO-1'];
  assert.equal(p1.tipo, 'promo');
  assert.equal(p1.costo, 10500);
  assert.equal(p1.costoFaltante, false);
  assert.equal(p1.revisar, true);
  assert.deepEqual(cat.porCodigo['PROMO-X'].faltantes, ['A-RAL']);
});

test('pedido: precio sugerido, total, costo y regla mayorista (desde 6 maples)', function () {
  var cat = catalogo();
  var r = L.calcularPedido([
    { codigo: 'H-B1', cantidad: 2 },
    { codigo: 'Q-FRESCO', cantidad: 0.5 },
    { codigo: 'PROMO-1', cantidad: 1 }
  ], cat, { umbralMayorista: 6 });
  assert.equal(r.totalSugerido, 14000 + 4500 + 20000);
  assert.equal(r.costo, 10000 + 3000 + 10500);
  assert.equal(r.mayorista, false);
  assert.equal(r.faltanPrecios, 0);

  var may = L.calcularPedido([{ codigo: 'H-B1', cantidad: 4 }, { codigo: 'H-B2', cantidad: 2, precioUnitario: '6.000' }, { codigo: 'A-HAR', cantidad: 1 }], cat, { umbralMayorista: 6 });
  assert.equal(may.maples, 6);
  assert.equal(may.mayorista, true);
  var b1 = may.lineas.filter(function (l) { return l.codigo === 'H-B1'; })[0];
  assert.equal(b1.precioSugerido, null);
  assert.equal(b1.requierePrecio, true);
  var har = may.lineas.filter(function (l) { return l.codigo === 'A-HAR'; })[0];
  assert.equal(har.precioUnitario, 1000); // lo que no es huevo sigue con precio
  assert.equal(may.faltanPrecios, 1);
  assert.equal(may.totalSugerido, 12000 + 1000);

  var cinco = L.calcularPedido([{ codigo: 'H-B1', cantidad: 5 }], cat, { umbralMayorista: 6 });
  assert.equal(cinco.mayorista, false);
  assert.equal(cinco.totalSugerido, 35000);

  var vacio = L.calcularPedido([{ codigo: 'H-B2', cantidad: 1 }], cat, { umbralMayorista: 6 });
  assert.equal(vacio.lineas[0].requierePrecio, true); // precio vacío en PRECIOS → a mano

  var raro = L.calcularPedido([{ codigo: 'NO-EXISTE', cantidad: 1, precioUnitario: 100 }], cat, {});
  assert.equal(raro.costoIncompleto, true);
  assert.equal(raro.totalSugerido, 100);
});

test('detalle legible del pedido', function () {
  var cat = catalogo();
  assert.equal(L.detalleLineas([{ codigo: 'H-B1', cantidad: 2 }, { codigo: 'Q-FRESCO', cantidad: 0.5 }, { codigo: 'PROMO-1', cantidad: 1 }, { codigo: 'A-HAR', cantidad: 3 }], cat),
    '2 maples Huevo B1, 0,5 kg Queso fresco, 1 PROMO 1, 3 Harina');
  assert.equal(L.unidadParaMostrar(2, 'medio cajón'), 'medios cajones');
  assert.equal(L.unidadParaMostrar(1, 'cajón'), 'cajón');
});

test('avisos: margen bajo, costo faltante, precio vacío, promo a revisar', function () {
  var cat = catalogo();
  var avisos = L.calcularAvisos(cat, 0.2);
  function hay(tipo, codigo) { return avisos.some(function (a) { return a.tipo === tipo && a.codigo === codigo; }); }
  assert.ok(hay('Costo faltante', 'A-RAL'));
  assert.ok(hay('Costo faltante', 'PROMO-X'));
  assert.ok(hay('Precio vacío', 'H-B2'));
  assert.ok(hay('Margen bajo', 'G-MED')); // 3100 vs 3000
  assert.ok(!hay('Margen bajo', 'H-B1')); // 7000 vs 5000 = 28,6%
  assert.ok(hay('Promo a revisar', 'PROMO-1'));
  assert.ok(!hay('Costo faltante', 'H-SUELTO')); // inactivo: no molesta
});

test('preparar y modificar un pedido (lo mismo en el celu y en la planilla)', function () {
  var cat = catalogo();
  var ctx = { catalogo: cat, config: { umbralMayorista: 6, caracteristica: '11', origenEnRuta: 'En ruta' }, ahora: '2026-10-05 09:00:00', hojasImpresas: [], ordenes: { '2026-10-05': 3 } };
  var r = L.prepararPedido({
    id: 'P1', fechaEntrega: '2026-10-05', telefono: '15 5555-0001', cliente: 'Ana', direccion: 'Calle 14 1234',
    lineas: [{ codigo: 'H-B1', cantidad: 2 }], totalCobrado: null, envio: '500'
  }, null, ctx);
  assert.equal(r.pedido.telefono, '+5491155550001');
  assert.equal(r.pedido.vuelta, '1ra');
  assert.equal(r.pedido.orden, 4);
  assert.equal(r.pedido.totalCobrado, 14000);
  assert.equal(r.pedido.ganancia, 14000 + 500 - 10000);
  assert.equal(r.pedido.estado, 'confirmado');
  assert.equal(r.lineas[0].precioUnitario, 7000);

  // Después de imprimir la hoja, lo nuevo para ese día va a la 2da.
  var r2 = L.prepararPedido({ id: 'P2', fechaEntrega: '2026-10-05', lineas: [{ codigo: 'A-HAR', cantidad: 1 }], totalCobrado: '$ 1.500' },
    null, Object.assign({}, ctx, { hojasImpresas: ['2026-10-05'] }));
  assert.equal(r2.pedido.vuelta, '2da');
  assert.equal(r2.pedido.totalCobrado, 1500);
  assert.equal(r2.pedido.cliente, 'Sin nombre');

  // Editar sin cambiar la fecha mantiene vuelta y orden.
  var r3 = L.prepararPedido({ id: 'P1', fechaEntrega: '2026-10-05', lineas: [{ codigo: 'H-B1', cantidad: 3 }] }, r.pedido,
    Object.assign({}, ctx, { hojasImpresas: ['2026-10-05'] }));
  assert.equal(r3.pedido.vuelta, '1ra');
  assert.equal(r3.pedido.orden, 4);
  assert.equal(r3.pedido.fechaCarga, '2026-10-05 09:00:00');

  // Venta en ruta: entregada, vuelta "en ruta" y origen de CONFIG.
  var vr = L.prepararPedido({ id: 'P3', enRuta: true, fechaEntrega: '2026-10-05', lineas: [{ codigo: 'A-HAR', cantidad: 2 }], estado: 'entregado', medio: 'Efectivo' }, null, ctx);
  assert.equal(vr.pedido.vuelta, 'en ruta');
  assert.equal(vr.pedido.estado, 'entregado');
  assert.equal(vr.pedido.medio, 'Efectivo');
  assert.equal(vr.pedido.origen, 'En ruta');

  // Cobrado → entregado; deshacer → confirmado sin medio; reprogramar → nueva fecha y orden.
  var c1 = L.aplicarCambiosPedido(r.pedido, { medio: 'Mercado Pago' }, Object.assign({}, ctx, { ahora: '2026-10-05 10:15:00' }));
  assert.equal(c1.pedido.estado, 'entregado');
  assert.deepEqual(c1.campos.sort(), ['actualizado', 'estado', 'medio']);
  var c2 = L.aplicarCambiosPedido(c1.pedido, { estado: 'confirmado' }, ctx);
  assert.equal(c2.pedido.medio, '');
  var ne = L.aplicarCambiosPedido(r.pedido, { estado: 'no estaba' }, ctx);
  var c3 = L.aplicarCambiosPedido(ne.pedido, { fechaEntrega: '2026-10-06' }, Object.assign({}, ctx, { ordenes: { '2026-10-06': 1 } }));
  assert.equal(c3.pedido.estado, 'confirmado');
  assert.equal(c3.pedido.orden, 2);
  var c4 = L.aplicarCambiosPedido(r.pedido, { totalCobrado: '15 mil' }, ctx);
  assert.equal(c4.pedido.totalCobrado, 15000);
  assert.equal(c4.pedido.ganancia, 15000 + 500 - 10000);
});

test('pendientes: sin dirección, sin fecha, no estaba y atrasados', function () {
  var hoy = '2026-10-05';
  assert.equal(L.motivoPendiente({ estado: 'no estaba', direccion: 'Mitre 1', fechaEntrega: hoy }, hoy), 'No estaba');
  assert.equal(L.motivoPendiente({ estado: 'confirmado', direccion: 'Mitre', fechaEntrega: hoy }, hoy), 'Falta la dirección');
  assert.equal(L.motivoPendiente({ estado: 'confirmado', direccion: 'Mitre 123', fechaEntrega: '' }, hoy), 'Sin fecha de entrega');
  assert.equal(L.motivoPendiente({ estado: 'confirmado', direccion: 'Mitre 123', fechaEntrega: '2026-10-02' }, hoy), 'Quedó de un día anterior');
  assert.equal(L.motivoPendiente({ estado: 'confirmado', direccion: 'Mitre 123', fechaEntrega: hoy }, hoy), '');
  assert.equal(L.motivoPendiente({ estado: 'entregado', direccion: '', fechaEntrega: hoy }, hoy), '');
  assert.equal(L.motivoPendiente({ estado: 'confirmado', vuelta: 'en ruta', direccion: '', fechaEntrega: hoy }, hoy), '');
  assert.ok(L.direccionCompleta('Calle 14 1234'));
  assert.ok(!L.direccionCompleta('1234'));
  assert.ok(!L.direccionCompleta('Mitre'));
});

test('links de ruta de Google Maps: se parten cuando hay muchas paradas', function () {
  var paradas = [];
  for (var i = 1; i <= 12; i++) paradas.push('Calle ' + i + ' 100, Berazategui');
  var links = L.armarLinksRuta('Local 1, Berazategui', paradas, 9);
  assert.equal(links.length, 2);
  assert.equal(links[0].desde, 1);
  assert.equal(links[0].hasta, 10);
  assert.equal(links[1].desde, 11);
  assert.equal(links[1].hasta, 12);
  assert.match(links[0].url, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&origin=Local%201%2C%20Berazategui&destination=Calle%2010%20100/);
  assert.equal((links[0].url.match(/%7C/g) || []).length, 8); // 9 paradas intermedias
  assert.match(links[1].url, /origin=Calle%2010%20100/); // arranca donde terminó el anterior
  assert.equal(L.armarLinksRuta('Local', [], 9).length, 0);
  assert.equal(L.armarLinksRuta('Local', ['A 1'], 3)[0].url.indexOf('waypoints'), -1);
  assert.equal(L.direccionParaMapa({ direccion: 'Calle 14 1234', barrio: '' }, { localidadPorDefecto: 'Berazategui', sufijoDirecciones: 'Buenos Aires, Argentina' }),
    'Calle 14 1234, Berazategui, Buenos Aires, Argentina');
});

test('ordenar ruta: aplica el orden de Google y respeta las vueltas', function () {
  assert.deepEqual(L.aplicarOrdenOptimizado(['a', 'b', 'c'], [2, 0, 1]), ['c', 'a', 'b']);
  assert.deepEqual(L.aplicarOrdenOptimizado(['a', 'b', 'c'], [1]), ['b', 'a', 'c']);
  var dia = [
    { id: 'E', orden: 1, estado: 'entregado', vuelta: '1ra' },
    { id: 'A', orden: 2, estado: 'confirmado', vuelta: '1ra' },
    { id: 'B', orden: 3, estado: 'confirmado', vuelta: '1ra' },
    { id: 'X', orden: 4, estado: 'confirmado', vuelta: '2da' },
    { id: 'Y', orden: 5, estado: 'confirmado', vuelta: '2da' }
  ];
  function ids(s) { return s.map(function (x) { return x.id; }); }
  assert.deepEqual(ids(L.nuevaSecuencia(dia, ['B', 'A'], '1ra')), ['E', 'B', 'A', 'X', 'Y']);
  assert.deepEqual(ids(L.nuevaSecuencia(dia, ['Y', 'X'], '2da')), ['E', 'A', 'B', 'Y', 'X']);
  assert.deepEqual(ids(L.nuevaSecuencia(dia, ['Y', 'A', 'X', 'B'], 'todas')), ['E', 'Y', 'A', 'X', 'B']);
  assert.deepEqual(L.nuevaSecuencia(dia, ['B', 'A'], '1ra').map(function (x) { return x.orden; }), [1, 2, 3, 4, 5]);
  assert.ok(L.entraEnVuelta({ vuelta: '' }, '1ra'));
  assert.ok(!L.entraEnVuelta({ vuelta: 'en ruta' }, 'todas'));
});

test('cierre del día: detalle, unidades, 70/30 sin descontarle gastos a Agustín, medios y retiro', function () {
  var cat = catalogo();
  var fecha = '2026-10-05';
  var pedidos = [
    { id: 'A', fechaEntrega: fecha, cliente: 'Ana', estado: 'entregado', medio: 'Efectivo', totalCobrado: 30000, envio: 0, costo: 20000,
      lineas: [{ codigo: 'PROMO-1', cantidad: 1 }, { codigo: 'H-B1', cantidad: 2 }] },
    { id: 'B', fechaEntrega: fecha, cliente: 'Beto', estado: 'entregado', medio: 'mp', totalCobrado: 10000, envio: 500, costo: 6000,
      lineas: [{ codigo: 'Q-FRESCO', cantidad: 1 }] },
    { id: 'C', fechaEntrega: fecha, cliente: 'Caro', estado: 'entregado', medio: '', totalCobrado: 5000, envio: 0, costo: 3000, costoIncompleto: true,
      lineas: [{ codigo: 'A-HAR', cantidad: 5 }] },
    { id: 'D', fechaEntrega: fecha, cliente: 'Dani', estado: 'no estaba', totalCobrado: 9999, costo: 1 },
    { id: 'F', fechaEntrega: fecha, cliente: 'Fede', estado: 'confirmado', totalCobrado: 1000, costo: 1 },
    { id: 'G', fechaEntrega: fecha, cliente: 'Gabi', estado: 'cancelado', totalCobrado: 1000, costo: 1 },
    { id: 'Z', fechaEntrega: '2026-10-04', cliente: 'Otro día', estado: 'entregado', medio: 'Efectivo', totalCobrado: 77777, costo: 1 }
  ];
  var gastos = [
    { id: 'g1', fecha: fecha, descripcion: 'Bolsas', monto: 1500, quienPaga: '' }, // vacío = lo paga el local
    { id: 'g2', fecha: fecha, descripcion: 'Nafta', monto: '2.000', quienPaga: 'lo paga el local' },
    { id: 'g3', fecha: '2026-10-04', descripcion: 'Otro día', monto: 999, quienPaga: 'lo paga el local' }
  ];
  var r = L.cierreDelDia({ fecha: fecha, pedidos: pedidos, gastos: gastos, retiroReal: '$ 15.000', porcentajeAgustin: 0.7,
    medios: ['Efectivo', 'Mercado Pago', 'Transferencia'], catalogo: cat, ordenCategorias: ['Huevos', 'Congelados', 'Quesos', 'Almacén'] });
  assert.equal(r.entregados, 3);
  assert.equal(r.ventas, 30000 + 10500 + 5000);
  assert.equal(r.costo, 29000);
  // Ganancia = ventas − costo de mercadería; los gastos no la tocan.
  assert.equal(r.ganancia, 16500);
  assert.equal(r.agustin, 11550);
  assert.equal(r.local, 4950);
  // Todo lo paga el local: se resta solo de su 30% y el retiro de Agustín es su 70% completo.
  assert.equal(r.gastosLocal, 3500);
  assert.equal(r.gastosCompartidos, 0);
  assert.equal(r.leQuedaLocal, 4950 - 3500);
  assert.equal(r.retiroCalculado, 11550);
  assert.equal(r.retiroReal, 15000);
  assert.equal(r.diferencia, 15000 - 11550);
  assert.deepEqual(Array.from(r.gastos, function (g) { return g.quienPaga; }), ['lo paga el local', 'lo paga el local']);
  assert.deepEqual(r.porMedio, [{ medio: 'Efectivo', monto: 30000 }, { medio: 'Mercado Pago', monto: 10500 }, { medio: 'Transferencia', monto: 0 }]);
  assert.equal(r.pendienteCobro, 5000);
  assert.deepEqual(r.sinEstadoFinal.map(function (p) { return p.cliente; }), ['Fede']);
  assert.deepEqual(r.noEstaban.map(function (p) { return p.cliente; }), ['Dani']);
  assert.equal(r.cancelados, 1);
  assert.equal(r.costosFaltantes, true);
  assert.equal(r.clientes[1].margen, Number(((10500 - 6000) / 10500).toFixed(6)));
  // Unidades: las promos se abren en sus productos (H-B2 de la promo + 2 H-B1 = 3 maples).
  var huevos = r.unidades.filter(function (u) { return u.categoria === 'Huevos'; })[0];
  assert.equal(huevos.cantidad, 3);
  assert.equal(huevos.texto, '3 maples');
  var quesos = r.unidades.filter(function (u) { return u.categoria === 'Quesos'; })[0];
  assert.equal(quesos.cantidad, 1.5);
  assert.deepEqual(r.unidades.map(function (u) { return u.categoria; }), ['Huevos', 'Congelados', 'Quesos', 'Almacén']);
  assert.deepEqual(r.promos, [{ nombre: 'PROMO 1', cantidad: 1 }]);
  // Un gasto que se reparte entre los dos se divide 70/30: a Agustín le baja su parte.
  var conCompartido = L.cierreDelDia({ fecha: fecha, pedidos: pedidos, retiroReal: '', porcentajeAgustin: 0.7, medios: [], catalogo: cat,
    gastos: gastos.concat([{ id: 'g4', fecha: fecha, descripcion: 'Publicidad', monto: 1000, quienPaga: 'se reparte entre los dos' }]) });
  assert.equal(conCompartido.agustin, 11550);
  assert.equal(conCompartido.gastosLocal, 3500);
  assert.equal(conCompartido.gastosCompartidos, 1000);
  assert.equal(conCompartido.compartidosAgustin, 700);
  assert.equal(conCompartido.compartidosLocal, 300);
  assert.equal(conCompartido.retiroCalculado, 11550 - 700);
  assert.equal(conCompartido.leQuedaLocal, 4950 - 3500 - 300);
  assert.equal(conCompartido.retiroCalculado + conCompartido.leQuedaLocal, 16500 - 4500); // no se pierde ni un peso
  // Sin retiro cargado, no hay diferencia.
  var sin = L.cierreDelDia({ fecha: fecha, pedidos: pedidos, gastos: [], retiroReal: '', porcentajeAgustin: 0.7, medios: [], catalogo: cat });
  assert.equal(sin.retiroReal, null);
  assert.equal(sin.diferencia, null);
});

test('hoja de reparto: filas, pendientes aparte, carga agrupada y links', function () {
  var cat = catalogo();
  var d = L.datosHojaReparto({
    fecha: '2026-10-05', vuelta: '1ra', catalogo: cat, generado: '05/10/2026 08:00',
    config: { nombreNegocio: 'Negocio de prueba', direccionLocal: 'Local 1', caracteristica: '11', paradasPorLink: 9, ordenCategorias: ['Huevos', 'Quesos'], localidadPorDefecto: 'Berazategui' },
    pedidos: [
      { id: 'A', cliente: 'Ana', telefono: '+5491155550001', direccion: 'Calle 14 1234', horario: 'después de las 17', notas: 'x'.repeat(80), totalCobrado: 14000, envio: 0,
        lineas: [{ codigo: 'H-B1', cantidad: 2 }] },
      { id: 'B', cliente: 'Beto', direccion: '', totalCobrado: 4500, lineas: [{ codigo: 'Q-FRESCO', cantidad: 0.5 }] }
    ]
  });
  assert.equal(d.filas.length, 1);
  assert.equal(d.filas[0].telefono, '11 5555-0001');
  assert.equal(d.filas[0].pedido, '2 maples Huevo B1');
  assert.equal(d.filas[0].notas.length, 60);
  assert.equal(d.pendientes.length, 1);
  assert.equal(d.carga[0].categoria, 'Huevos');
  assert.equal(d.carga[0].filas[0].texto, '2 maples');
  assert.equal(d.carga[1].filas[0].texto, '0,5 kg');
  assert.equal(d.links.length, 1);
  assert.equal(d.total, '$ 18.500');
  assert.equal(d.vueltaTexto, '1ra vuelta');
  assert.equal(d.fechaTexto, 'lunes 5 de octubre 2026');
});

test('clientes: estadísticas, búsqueda y cambios', function () {
  var s = L.estadisticasCliente([
    { estado: 'entregado', fechaEntrega: '2026-10-03', totalCobrado: 1000, envio: 100, origen: 'Pedix' },
    { estado: 'entregado', fechaEntrega: '2026-09-28', totalCobrado: 2000, envio: 0, origen: '' },
    { estado: 'cancelado', fechaEntrega: '2026-09-01', totalCobrado: 9999 },
    { estado: 'confirmado', fechaEntrega: '2026-10-09', totalCobrado: 9999 }
  ]);
  assert.deepEqual(s, { primeraCompra: '2026-09-28', ultimaCompra: '2026-10-03', cantidadCompras: 2, totalGastado: 3100, origenPrimera: 'Pedix' });
  assert.equal(L.estadisticasCliente([]).cantidadCompras, 0);

  var clientes = [
    { telefono: '+5491155550001', nombre: 'Ana López', direccion: 'Mitre 100', ultimaCompra: '2026-10-01' },
    { telefono: '+5491155550002', nombre: 'Anabela Ruiz', direccion: 'Calle 14 200', ultimaCompra: '2026-10-04' },
    { telefono: '+5491155550003', nombre: 'José Núñez', direccion: 'Belgrano 300', ultimaCompra: '' }
  ];
  assert.deepEqual(L.buscarClientes(clientes, 'ana', 5).map(function (c) { return c.nombre; }), ['Anabela Ruiz', 'Ana López']);
  assert.deepEqual(L.buscarClientes(clientes, 'jose nunez').map(function (c) { return c.nombre; }), ['José Núñez']);
  assert.deepEqual(L.buscarClientes(clientes, '5550003').map(function (c) { return c.nombre; }), ['José Núñez']);
  assert.deepEqual(L.buscarClientes(clientes, 'mitre').map(function (c) { return c.nombre; }), ['Ana López']);
  assert.deepEqual(L.buscarClientes(clientes, ''), []);

  assert.deepEqual(L.cambiosCliente({ nombre: 'Ana', direccion: 'Mitre 100', barrio: '' }, { nombre: 'Ana', direccion: 'Otra 5', barrio: 'Hudson' }, false), { barrio: 'Hudson' });
  assert.deepEqual(L.cambiosCliente({ nombre: 'Ana', direccion: 'Mitre 100' }, { nombre: 'Ana María', direccion: 'Otra 5' }, true), { nombre: 'Ana María', direccion: 'Otra 5' });
  assert.deepEqual(L.cambiosCliente({ nombre: 'Ana' }, { nombre: 'Sin nombre' }, true), {});
});

test('zonas y direcciones de contactos', function () {
  var zonas = [{ barrio: 'Berazategui', llegamos: 'sí' }, { barrio: 'Villa España', llegamos: 'si' }, { barrio: 'Bernal', llegamos: 'no' }, { barrio: 'Ezpeleta', llegamos: 'consultar' }];
  assert.equal(L.clasificarZona('villa espana', zonas).estado, 'si');
  assert.equal(L.clasificarZona('Villa España', zonas).barrio, 'Villa España');
  assert.equal(L.clasificarZona('Bernal', zonas).estado, 'no');
  assert.equal(L.clasificarZona('Ezpeleta', zonas).estado, 'consultar');
  assert.equal(L.clasificarZona('Marte', zonas).estado, '');
  assert.deepEqual(L.separarDireccionContacto('Calle 14 1234\nVilla España\nBuenos Aires', zonas), { direccion: 'Calle 14 1234', barrio: 'Villa España' });
  assert.deepEqual(L.separarDireccionContacto('Mitre 55, Bernal Oeste', zonas), { direccion: 'Mitre 55', barrio: 'Bernal' });
  assert.deepEqual(L.separarDireccionContacto('', zonas), { direccion: '', barrio: '' });
});

test('importar clientes: normaliza teléfonos y no duplica', function () {
  var zonas = [{ barrio: 'Hudson', llegamos: 'sí' }];
  var r = L.prepararImportacionClientes([
    { nombre: 'Ana', telefono: '+54 9 11 5555-0001', direccion: 'Calle 1 100\nHudson', notas: 'portón negro' },
    { nombre: 'Ana repetida', telefono: '11 5555 0001', direccion: '', notas: '' },
    { nombre: 'Beto', telefono: '15 5555-0002 ::: 11 5555-0099', direccion: '', notas: '' },
    { nombre: 'Sin tel', telefono: '', direccion: '', notas: '' },
    { nombre: 'Medio tel', telefono: '11 555', direccion: '', notas: '' },
    { nombre: 'Ya estaba', telefono: '1155550003', direccion: 'Mitre 9', notas: 'nota nueva' }
  ], [{ telefono: '+5491155550003', nombre: 'Ya estaba', direccion: '', notas: 'vieja' }], zonas, '11');
  assert.deepEqual(r.nuevos.map(function (c) { return c.telefono; }), ['+5491155550001', '+5491155550002']);
  assert.equal(r.nuevos[0].barrio, 'Hudson');
  assert.equal(r.repetidos, 2);
  assert.equal(r.sinTelefono, 2);
  assert.deepEqual(r.actualizar, [{ telefono: '+5491155550003', cambios: { direccion: 'Mitre 9' } }]);
});

test('importar ventas viejas: IDs estables, teléfonos, medios y productos', function () {
  var cat = catalogo();
  var id1 = L.idImportacion(['2026-10-01', 'Ana', 'PROMO 1', '', 20000, 'Efectivo', ''], 1);
  var id2 = L.idImportacion(['2026-10-01', 'ana ', 'promo 1', '', '20000', 'efectivo', ''], 1);
  var id3 = L.idImportacion(['2026-10-01', 'Ana', 'PROMO 1', '', 20000, 'Efectivo', ''], 2);
  assert.equal(id1, id2);
  assert.notEqual(id1, id3);
  assert.match(id1, /^IMP-[A-Z0-9]+$/);

  var ctx = { catalogo: cat, medios: ['Efectivo', 'Mercado Pago'], caracteristica: '11', clientesPorNombre: { 'jose': ['+5491155550007'] }, id: 'IMP-1', ahora: '2026-10-05 10:00:00' };
  var v = L.interpretarVentaImportada({ fecha: '2026-10-01', cliente: 'Ana 11 5555-0001', zona: 'Hudson', producto: 'PROMO 1', detalle: '', precio: '$20.000', costo: '10.500', ganancia: '', medio: 'MP', nota: '' }, ctx);
  assert.equal(v.pedido.telefono, '+5491155550001');
  assert.equal(v.pedido.cliente, 'Ana');
  assert.equal(v.pedido.estado, 'entregado');
  assert.equal(v.pedido.medio, 'Mercado Pago');
  assert.equal(v.pedido.ganancia, 9500);
  assert.equal(v.lineas.length, 1);
  assert.equal(v.lineas[0].codigo, 'PROMO-1');

  var sinNombre = L.interpretarVentaImportada({ fecha: '2026-10-02', cliente: '', producto: 'Algo raro', precio: 5000, costo: '', ganancia: 2000, medio: 'efvo' }, ctx);
  assert.equal(sinNombre.pedido.cliente, 'Sin nombre');
  assert.equal(sinNombre.pedido.costo, 3000);
  assert.equal(sinNombre.pedido.medio, 'Efectivo');
  assert.equal(sinNombre.lineas.length, 0);
  assert.equal(sinNombre.pedido.detalle, 'Algo raro');

  var medio = L.interpretarVentaImportada({ fecha: '2026-10-02', cliente: 'Pedro 11 5555', producto: '2 Huevo B1', precio: 14000 }, ctx);
  assert.equal(medio.pedido.telefono, '');
  assert.match(medio.pedido.notas, /Teléfono incompleto/);
  assert.equal(medio.pedido.costoIncompleto, true);
  assert.equal(medio.lineas[0].cantidad, 2);
  assert.equal(medio.lineas[0].precioUnitario, 7000);

  var porNombre = L.interpretarVentaImportada({ fecha: '2026-10-02', cliente: 'José', precio: 1000, costo: 500 }, ctx);
  assert.equal(porNombre.pedido.telefono, '+5491155550007');
  assert.equal(L.extraerIdPlanilla('https://docs.google.com/spreadsheets/d/' + 'a'.repeat(30) + '/edit#gid=0'), 'a'.repeat(30));
  assert.equal(L.extraerIdPlanilla('corto'), '');
});

test('quién paga un gasto: por defecto el local', function () {
  assert.equal(L.normalizarQuienPaga(''), 'lo paga el local');
  assert.equal(L.normalizarQuienPaga('Lo paga el local'), 'lo paga el local');
  assert.equal(L.normalizarQuienPaga('cualquier cosa'), 'lo paga el local');
  assert.equal(L.normalizarQuienPaga('Se reparte entre los dos'), 'se reparte entre los dos');
  assert.equal(L.normalizarQuienPaga('compartido'), 'se reparte entre los dos');
  assert.deepEqual(L.LISTA_QUIEN_PAGA, ['lo paga el local', 'se reparte entre los dos']);
});

test('medios de pago: se llevan al nombre de CONFIG', function () {
  var medios = ['Efectivo', 'Mercado Pago', 'Transferencia'];
  assert.equal(L.normalizarMedio('MP', medios), 'Mercado Pago');
  assert.equal(L.normalizarMedio('mercadopago', medios), 'Mercado Pago');
  assert.equal(L.normalizarMedio('efvo', medios), 'Efectivo');
  assert.equal(L.normalizarMedio('cheque', medios), 'cheque'); // lo que no conoce queda igual
  assert.equal(L.normalizarMedio('efectivo ', medios), 'Efectivo');
  assert.equal(L.normalizarMedio('transf', medios), 'Transferencia');
  assert.equal(L.normalizarMedio('', medios), '');
  assert.equal(L.etiquetaCorta('Mercado Pago'), 'MP');
});

test('la lógica se puede mandar entera a la web app y da lo mismo', function () {
  var copia = vm.runInNewContext('(' + modulo.crearLogica_.toString() + ')()', { Intl: Intl });
  var cat = copia.armarCatalogo({ costos: COSTOS, precios: PRECIOS, promos: PROMOS, composicion: COMPOSICION });
  var r = copia.calcularPedido([{ codigo: 'PROMO-1', cantidad: 2 }], cat, { umbralMayorista: 6 });
  assert.equal(r.totalSugerido, 40000);
  assert.equal(r.costo, 21000);
  assert.equal(copia.normalizarTelefono('15 5555-0001', '11'), '+5491155550001');
});
