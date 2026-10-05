'use strict';
// Recompra, tablero y avisos de punta a punta con el simulador de Google (datos inventados):
// instalar (también sobre una planilla que ya tenía CLIENTES) → RECOMPRA → tildar en la planilla →
// marcar desde la web app → resultado del mensaje → GASTO_META → TABLERO → activador diario.
var test = require('node:test');
var assert = require('node:assert/strict');
var simulador = require('./apoyo/simulador');

var AHORA = new Date('2026-10-14T12:00:00Z'); // miércoles 14/10, 09:00 en Buenos Aires
var TZ = simulador.TZ;

function plano(x) { return JSON.parse(JSON.stringify(x)); }

function fecha(v) { return Object.prototype.toString.call(v) === '[object Date]' ? simulador.formatearFecha(v, TZ, 'yyyy-MM-dd') : v; }

function tabla(entorno, nombre) {
  var m = entorno.planilla.getSheetByName(nombre).matriz();
  var enc = m[0];
  return m.slice(1).map(function (fila, i) {
    var o = { _fila: i + 2 };
    enc.forEach(function (h, j) { if (h) o[h] = fila[j]; });
    return o;
  });
}

function columna(entorno, nombre, encabezado) {
  return entorno.planilla.getSheetByName(nombre).matriz()[0].indexOf(encabezado) + 1;
}

function filaDe(entorno, nombre, telefono) {
  return tabla(entorno, nombre).filter(function (f) { return f['Teléfono'] === telefono; })[0];
}

function preparar() {
  var entorno = simulador.crearEntorno({ ahora: AHORA });
  var p = entorno.planilla;
  p.cargarHoja('COSTOS', [
    ['Código', 'Producto', 'Unidad base', 'Costo unitario base', 'Categoría'],
    ['H-B1', 'Huevo blanco', 'maple', 5000, 'Huevos'],
    ['Q-FRESCO', 'Queso fresco', 'kg', 6000, 'Quesos'],
    ['G-MED', 'Medallón', 'kg', 3000, 'Congelados'],
    ['P-BAST', 'Bastoncitos', 'kg', 3500, 'Congelados']
  ]).proteger(); // el sistema nunca escribe en COSTOS
  // Una planilla que ya venía de la etapa anterior: CLIENTES sin las columnas nuevas y con un cliente de antes.
  p.cargarHoja('CLIENTES', [
    ['Teléfono', 'Nombre', 'Calle y altura', 'Entre calles', 'Barrio', 'Referencia', 'Primera compra', 'Última compra',
      'Cantidad de compras', 'Total gastado', 'Origen de la primera compra', 'Notas', 'Alta'],
    ['+5491155550009', 'Av. Mitre 500', '', '', 'Hudson', '', '', '', 0, 0, '', 'importado de contactos', '']
  ]);
  return entorno;
}

function pedido(g, datos) {
  return g.guardarPedido(Object.assign({ envio: 0, totalCobrado: null, origen: '', notas: '', direccion: 'Mitre 100', barrio: 'Hudson' }, datos));
}

test('recompra y tablero en la planilla', async function (t) {
  var entorno = preparar();
  var g = entorno.g;
  var p = entorno.planilla;

  await t.test('instalar crea lo nuevo, agrega columnas y deja un solo activador diario', function () {
    var informe = g.instalar();
    ['RECOMPRA', 'RECOMPRA_MENSAJES', 'GASTO_META', 'TABLERO'].forEach(function (n) { assert.ok(p.getSheetByName(n), 'falta ' + n); });
    var clientes = tabla(entorno, 'CLIENTES');
    assert.equal(clientes.length, 1);
    assert.equal(clientes[0].Notas, 'importado de contactos'); // no se pisó nada
    assert.equal(clientes[0]['No escribir'], '');
    assert.equal(clientes[0]['Cliente de antes'], 'sí'); // no tiene pedidos: se marca al calcular RECOMPRA
    var config = {};
    tabla(entorno, 'CONFIG').forEach(function (f) { config[f.Clave] = f.Valor; });
    assert.equal(config['Recompra: ciclo por defecto (días)'], '14');
    assert.equal(config['Recompra: días sin volver a escribirle'], '7');
    assert.equal(config['Recompra: días para ver si volvió a comprar'], '7');
    assert.equal(config['Recompra: tope de mensajes por día'], '15');
    assert.equal(config['Origen de los pedidos de recompra'], 'Recompra');
    assert.match(config['Mensaje recompra: general'], /\{nombre\}.*\{ultima_compra\}.*\{dia_reparto\}.*Agus de Llegamos/);
    assert.match(config['Mensaje recompra: PROMO FULL'], /Agus de Llegamos/);
    assert.match(config['Mensaje recompra: Huevos'], /Agus de Llegamos/);
    assert.match(config['Mensaje recompra: cliente de antes'], /Agus de Llegamos/);
    assert.equal(config['Palabras de publicidad en GASTOS'], 'publicidad, anuncio, Meta');
    assert.equal(entorno.registro.activadores.length, 1);
    assert.deepEqual(plano(entorno.registro.activadores[0].datos), { funcion: 'recalcularTodoDiario', cadaDias: 1, hora: 8, zona: TZ });
    assert.match(informe, /entre las 8 y las 9/);
    // Otra vez: nada duplicado, y un ejemplo borrado no vuelve.
    var hojaConfig = p.getSheetByName('CONFIG');
    var filaEjemplo = tabla(entorno, 'CONFIG').filter(function (f) { return f.Clave === 'Mensaje recompra: PROMO FULL'; })[0]._fila;
    hojaConfig.deleteRow(filaEjemplo);
    var cantidad = tabla(entorno, 'CONFIG').length;
    g.instalar();
    assert.equal(tabla(entorno, 'CONFIG').length, cantidad);
    assert.equal(entorno.registro.activadores.length, 1);
  });

  await t.test('RECOMPRA: una fila por cliente, ordenada, con link de WhatsApp y casillas', function () {
    ['H-B1', 'Q-FRESCO', 'G-MED', 'P-BAST'].forEach(function (codigo, i) {
      var precios = p.getSheetByName('PRECIOS');
      var fila = tabla(entorno, 'PRECIOS').filter(function (f) { return f['Código'] === codigo; })[0]._fila;
      precios.getRange(fila, columna(entorno, 'PRECIOS', 'Precio público sugerido')).setValue([7000, 9000, 4000, 5000][i]);
    });
    // Ana: compró el 20/9 y el 30/9 (ciclo 10 días). Beto: una vez el 10/10. Caro: queso el 15/9.
    pedido(g, { id: 'A1', telefono: '1155550001', cliente: 'Ana', fechaEntrega: '2026-09-20', lineas: [{ codigo: 'H-B1', cantidad: 2 }] });
    pedido(g, { id: 'A2', telefono: '1155550001', cliente: 'Ana', fechaEntrega: '2026-09-30', lineas: [{ codigo: 'H-B1', cantidad: 2 }] });
    pedido(g, { id: 'B1', telefono: '1155550002', cliente: 'Beto', fechaEntrega: '2026-10-10', lineas: [{ codigo: 'PROMO-1', cantidad: 1 }] });
    pedido(g, { id: 'C1', telefono: '1155550003', cliente: 'Caro', fechaEntrega: '2026-09-15', lineas: [{ codigo: 'Q-FRESCO', cantidad: 1 }] });
    ['A1', 'A2', 'B1', 'C1'].forEach(function (id) { g.actualizarPedido(id, { medio: 'Efectivo' }); });
    var r = g.recalcularRecompra();
    assert.deepEqual(plano(r), { filas: 4, lista: 3, pasanTope: 0, escritosHoy: 0 });
    var filas = tabla(entorno, 'RECOMPRA');
    assert.deepEqual(filas.map(function (f) { return f.Nombre; }), ['Av. Mitre 500', 'Ana', 'Caro', 'Beto']);
    var antes = filas[0];
    assert.equal(antes.Tipo, 'cliente de antes');
    assert.equal(antes.Prioridad, 'Alta');
    assert.equal(antes.Estado, 'Escribir hoy');
    assert.match(antes.Mensaje, /^¡Hola! Soy Agus/); // el "nombre" es una dirección: saluda sin nombre
    var ana = filas[1];
    assert.equal(ana.Tipo, 'recompra');
    assert.equal(ana['Días desde la última compra'], 14);
    assert.equal(ana['Ciclo del cliente (días)'], 10);
    assert.equal(ana['Cantidad de compras'], 2);
    assert.equal(ana['Total gastado'], 28000);
    assert.equal(fecha(ana['Última compra']), '2026-09-30');
    assert.equal(ana['Qué compró la última vez'], '2 maples Huevo blanco');
    assert.match(ana.Mensaje, /^¡Hola Ana! ¿Cómo andás de huevos\? 🥚 Paso hoy/);
    assert.equal(ana.Escribir, 'Escribir');
    assert.equal(ana['Le escribí'], false);
    assert.equal(filas[3].Estado, 'Faltan 10 días');
    var hoja = p.getSheetByName('RECOMPRA');
    var link = hoja.getRange(ana._fila, columna(entorno, 'RECOMPRA', 'Escribir')).getRichTextValues()[0][0].link;
    assert.equal(link, 'https://wa.me/5491155550001?text=' + encodeURIComponent(ana.Mensaje));
    assert.equal(hoja.validaciones[ana._fila + ',' + columna(entorno, 'RECOMPRA', 'Le escribí')].casilla, true);
    assert.equal(hoja.validaciones[ana._fila + ',' + columna(entorno, 'RECOMPRA', 'No escribir')].casilla, true);
    assert.equal(hoja.getRange(ana._fila, columna(entorno, 'RECOMPRA', 'Teléfono')).getNumberFormat(), '@');
  });

  await t.test('tildar "Le escribí" guarda la fecha sola; destildar lo borra', function () {
    var hoja = p.getSheetByName('RECOMPRA');
    var col = columna(entorno, 'RECOMPRA', 'Le escribí');
    var ana = filaDe(entorno, 'RECOMPRA', '+5491155550001');
    hoja.getRange(ana._fila, col).setValue(true);
    g.onEdit({ range: hoja.getRange(ana._fila, col), value: 'TRUE' });
    ana = filaDe(entorno, 'RECOMPRA', '+5491155550001');
    assert.equal(ana['Le escribí'], true);
    assert.equal(simulador.formatearFecha(ana['Le escribí el'], TZ, 'yyyy-MM-dd HH:mm'), '2026-10-14 09:00');
    assert.equal(ana.Resultado, 'Esperando');
    assert.equal(ana.Estado, 'Le escribiste hoy');
    var mensajes = tabla(entorno, 'RECOMPRA_MENSAJES');
    assert.equal(mensajes.length, 1);
    assert.equal(mensajes[0]['Teléfono'], '+5491155550001');
    assert.equal(mensajes[0].Cliente, 'Ana');
    assert.equal(mensajes[0].Tipo, 'recompra');
    // Por error: se destilda y el mensaje se borra.
    hoja.getRange(ana._fila, col).setValue(false);
    g.onEdit({ range: hoja.getRange(ana._fila, col), value: 'FALSE' });
    assert.equal(tabla(entorno, 'RECOMPRA_MENSAJES').length, 0);
    ana = filaDe(entorno, 'RECOMPRA', '+5491155550001');
    assert.equal(ana['Le escribí el'], '');
    assert.equal(ana.Estado, 'Escribir hoy');
    // Una edición en otra pestaña no hace nada.
    g.onEdit({ range: p.getSheetByName('CONFIG').getRange(2, 2), value: 'x' });
    assert.equal(tabla(entorno, 'RECOMPRA_MENSAJES').length, 0);
  });

  await t.test('"No escribir" en la planilla va a CLIENTES y sale de RECOMPRA', function () {
    var hoja = p.getSheetByName('RECOMPRA');
    var col = columna(entorno, 'RECOMPRA', 'No escribir');
    var caro = filaDe(entorno, 'RECOMPRA', '+5491155550003');
    hoja.getRange(caro._fila, col).setValue(true);
    g.onEdit({ range: hoja.getRange(caro._fila, col), value: 'TRUE' });
    assert.equal(filaDe(entorno, 'CLIENTES', '+5491155550003')['No escribir'], 'sí');
    g.recalcularRecompra();
    assert.equal(filaDe(entorno, 'RECOMPRA', '+5491155550003'), undefined);
  });

  await t.test('lo tildado sin pasar por onEdit se guarda igual al recalcular', function () {
    var hoja = p.getSheetByName('RECOMPRA');
    var antes = filaDe(entorno, 'RECOMPRA', '+5491155550009');
    hoja.getRange(antes._fila, columna(entorno, 'RECOMPRA', 'Le escribí')).setValue(true);
    g.recalcularRecompra();
    var m = tabla(entorno, 'RECOMPRA_MENSAJES');
    assert.equal(m.length, 1);
    assert.equal(m[0].Tipo, 'cliente de antes');
    assert.equal(filaDe(entorno, 'RECOMPRA', '+5491155550009').Estado, 'Le escribiste hoy');
  });

  await t.test('la web app: Listo, Deshacer y No escribir', function () {
    var r = g.marcarEscrito('+5491155550001', '2026-10-14 09:30:00', 'recompra');
    assert.equal(r.telefono, '+5491155550001');
    assert.equal(tabla(entorno, 'RECOMPRA_MENSAJES').length, 2);
    g.marcarEscrito('+5491155550001', '2026-10-14 09:40:00', 'recompra'); // dos veces el mismo día: uno solo
    assert.equal(tabla(entorno, 'RECOMPRA_MENSAJES').length, 2);
    assert.equal(filaDe(entorno, 'RECOMPRA', '+5491155550001')['Le escribí'], true);
    g.desmarcarEscrito('+5491155550001', '2026-10-14 09:30:00');
    assert.equal(tabla(entorno, 'RECOMPRA_MENSAJES').length, 1);
    g.marcarEscrito('+5491155550001', '2026-10-14 09:45:00', 'recompra');
    g.marcarNoEscribir('+5491155550002', true);
    assert.equal(filaDe(entorno, 'CLIENTES', '+5491155550002')['No escribir'], 'sí');
    assert.equal(filaDe(entorno, 'RECOMPRA', '+5491155550002')['No escribir'], true);
    g.marcarNoEscribir('+5491155550002', false);
    assert.equal(filaDe(entorno, 'CLIENTES', '+5491155550002')['No escribir'], '');
    var d = g.obtenerDatos();
    assert.equal(d.recompra.disponible, true);
    assert.ok(d.recompra.fichas.some(function (f) { return f.telefono === '+5491155550001' && f.plantilla === 'huevos'; }));
    assert.deepEqual(plano(d.envios.map(function (m) { return m.telefono; }).sort()), ['+5491155550001', '+5491155550009']);
    assert.equal(d.numeros.semanas.length, 2);
    assert.equal(d.clientes.filter(function (c) { return c.telefono === '+5491155550003'; })[0].noEscribir, true);
  });

  await t.test('resultado: Ana vuelve a comprar; el cliente de antes no responde', function () {
    entorno.moverReloj(new Date('2026-10-15T13:00:00Z')); // jueves 10:00
    var nuevo = pedido(g, { id: 'A3', telefono: '1155550001', cliente: 'Ana', fechaEntrega: '2026-10-15', lineas: [{ codigo: 'H-B1', cantidad: 2 }] });
    assert.equal(nuevo.pedido.estado, 'confirmado');
    g.recalcularRecompra();
    var m = tabla(entorno, 'RECOMPRA_MENSAJES');
    var deAna = m.filter(function (x) { return x['Teléfono'] === '+5491155550001'; })[0];
    assert.equal(deAna.Resultado, 'Volvió a comprar');
    assert.equal(deAna['Pedido con el que volvió'], 'A3');
    assert.equal(filaDe(entorno, 'RECOMPRA', '+5491155550001').Estado, 'Tiene un pedido en curso');
    // Nueve días después del mensaje al cliente de antes, sin pedido.
    entorno.moverReloj(new Date('2026-10-23T12:00:00Z'));
    g.recalcularRecompra();
    var antes = tabla(entorno, 'RECOMPRA_MENSAJES').filter(function (x) { return x['Teléfono'] === '+5491155550009'; })[0];
    assert.equal(antes.Resultado, 'Sin respuesta');
    var fila = filaDe(entorno, 'RECOMPRA', '+5491155550009');
    assert.equal(fila.Resultado, 'Sin respuesta (mensaje del 14/10)');
    assert.equal(fila['Le escribí'], false);
    assert.equal(fila.Prioridad, 'Media'); // 100 − 30 por el mensaje sin respuesta
    assert.equal(fila.Estado, 'Escribir hoy');
  });

  await t.test('publicidad en GASTOS: aviso en AVISOS', function () {
    g.guardarGasto({ id: 'G1', fecha: '2026-10-23', descripcion: 'Nafta', monto: 2000 });
    g.guardarGasto({ id: 'G2', fecha: '2026-10-23', descripcion: 'Anuncio Meta', monto: 5000 });
    var avisos = g.actualizarAvisos();
    var publicidad = avisos.filter(function (a) { return a.tipo === 'Publicidad en GASTOS'; });
    assert.equal(publicidad.length, 1);
    assert.equal(publicidad[0].codigo, 'G2');
    assert.ok(tabla(entorno, 'AVISOS').some(function (a) { return a.Tipo === 'Publicidad en GASTOS' && /GASTO_META/.test(a.Detalle); }));
    g.borrarGasto('G2');
  });

  await t.test('GASTO_META y TABLERO', function () {
    var meta = p.getSheetByName('GASTO_META');
    meta.getRange(2, 1, 2, 2).setValues([['2026-10-19', 4000], ['2026-10-12', 1500]]);
    g.actualizarPedido('A3', { medio: 'Mercado Pago' });
    var r = g.recalcularTablero();
    assert.equal(r.semanas.length, 8);
    var semana = r.semanas.filter(function (s) { return s.lunes === '2026-10-12'; })[0];
    assert.equal(semana.pedidos, 1); // A3 de Ana, entregado el 15/10
    assert.equal(semana.ventas, 14000);
    assert.equal(semana.repitieron, 1);
    assert.equal(semana.mensajes, 2); // los dos mensajes del 14/10
    assert.equal(semana.volvieron, 1);
    assert.equal(semana.meta, 1500);
    var actual = r.semanas[0];
    assert.equal(actual.lunes, '2026-10-19');
    assert.equal(actual.meta, 4000);
    assert.equal(actual.gastosLocal, 2000); // la nafta del 23/10
    assert.equal(actual.leQuedaLocal, 0 - 2000 - 4000);
    var m = p.getSheetByName('TABLERO').matriz();
    assert.match(m[0][0], /^TABLERO — por semana/);
    assert.equal(m[3][0], 'Semana');
    assert.equal(m[3][15], 'Le queda al local');
    assert.equal(m[4][0], 'lun 19/10 al dom 25/10 (en curso)');
    assert.equal(m[4][10], 4000);
    assert.ok(m.some(function (f) { return /POR PROMO/.test(f[0]); }));
    assert.ok(m.some(function (f) { return f[0] === 'Hudson'; }));
    assert.ok(m.some(function (f) { return /^Activos/.test(f[0]); }));
    var numeros = g.obtenerNumeros();
    assert.equal(numeros.semanas.length, 2);
    assert.equal(numeros.semanas[0].meta, 4000);
  });

  await t.test('menú y activador diario', function () {
    g.recalcularRecompraDesdeMenu();
    assert.match(entorno.registro.alertas.pop(), /RECOMPRA lista ✓[\s\S]*Hoy tocan \d+ mensaje/);
    g.recalcularTableroDesdeMenu();
    assert.match(entorno.registro.alertas.pop(), /TABLERO listo ✓/);
    assert.equal(g.recalcularTodoDiario(), 'ok');
  });
});

test('la web app no se rompe si todavía no se corrió Instalar después de actualizar', function () {
  var entorno = preparar();
  var g = entorno.g;
  g.instalar();
  ['RECOMPRA', 'RECOMPRA_MENSAJES', 'GASTO_META', 'TABLERO'].forEach(function (n) {
    var hojas = entorno.planilla.hojas;
    hojas.splice(hojas.indexOf(entorno.planilla.getSheetByName(n)), 1);
  });
  var d = g.obtenerDatos();
  assert.equal(d.recompra.disponible, false);
  assert.deepEqual(plano(d.envios), []);
  assert.throws(function () { g.recalcularRecompra(); }, /Corré Avícola → Instalar/);
});
