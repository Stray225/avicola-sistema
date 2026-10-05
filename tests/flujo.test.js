'use strict';
// Recorre el circuito completo de Codigo.gs con el simulador de Google (datos inventados):
// instalar → cargar pedidos → ordenar ruta → hoja PDF → cobrar → cerrar el día → importar.
var test = require('node:test');
var assert = require('node:assert/strict');
var vm = require('node:vm');
var simulador = require('./apoyo/simulador');
var plantillas = require('./apoyo/plantillas');

var HOY = '2026-10-05'; // lunes
var AHORA = new Date('2026-10-05T12:00:00Z'); // 09:00 en Buenos Aires

function prepararPlanilla(entorno) {
  var p = entorno.planilla;
  p.cargarHoja('INICIO', [['Planilla de prueba'], ['Texto que no hay que tocar']]);
  // Mismas columnas que COSTOS de la FUENTE ÚNICA: el costo se carga en "Costo compra" (D) y
  // "Costo unitario base" (G) es la fórmula =D/E (acá va su resultado). Con un título arriba,
  // para probar que el encabezado se busca por nombre.
  p.cargarHoja('COSTOS', [
    ['COSTOS (título arriba de los encabezados)'],
    ['Código', 'Producto', 'Unidad compra', 'Costo compra', 'Unidades base/compra', 'Unidad base', 'Costo unitario base', 'Actualizado', 'Costo por bulto (si aplica)', 'Categoría'],
    ['H-B1', 'Huevo blanco N°1', 'cajón 12 maples', 60000, 12, 'maple', 5000, '2026-09-29', '', 'Huevos'],
    ['H-B2', 'Huevo blanco N°2', 'cajón 12 maples', 54000, 12, 'maple', '$4.500,00', '2026-09-29', '', 'Huevos'],
    ['G-MED', 'Medallón', 'kg', 3000, 1, 'kg', 3000, '2026-09-28', '', 'Congelados'],
    ['G-PAT', 'Patitas', 'kg', 2800, 1, 'kg', 2800, '2026-09-28', '', 'Congelados'],
    ['P-BAST', 'Bastoncitos', 'kg', 3500, 1, 'kg', 3500, '2026-09-28', '', 'Congelados'],
    ['Q-FRESCO', 'Queso fresco', 'kg', 6000, 1, 'kg', 6000, '2026-09-29', '', 'Quesos'],
    ['A-HAR', 'Harina', 'unidad (bulto)', 800, 1, 'unidad', 800, '2026-10-05', '', 'Almacén'],
    ['A-RAL', 'Rallado', 'unidad (bulto)', '', 1, 'unidad', '', '', '', 'Almacén']
  ]);
  p.cargarHoja('PROMOS', [['Promo vieja', 123]]);
  p.cargarHoja('STOCK', [['Producto', 'Cantidad'], ['H-B1', 10]]);
  // El sistema nunca escribe en estas pestañas: si lo intenta, el test falla.
  ['INICIO', 'COSTOS', 'PROMOS', 'STOCK'].forEach(function (n) { p.getSheetByName(n).proteger(); });
}

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
  var hoja = entorno.planilla.getSheetByName(nombre);
  return hoja.matriz()[0].indexOf(encabezado) + 1;
}

function ponerConfig(entorno, clave, valor) {
  var hoja = entorno.planilla.getSheetByName('CONFIG');
  var filas = tabla(entorno, 'CONFIG');
  var fila = filas.filter(function (f) { return f.Clave === clave; })[0];
  hoja.getRange(fila._fila, 2).setValue(valor);
}

function ponerPrecio(entorno, codigo, precio) {
  var hoja = entorno.planilla.getSheetByName('PRECIOS');
  var fila = tabla(entorno, 'PRECIOS').filter(function (f) { return f['Código'] === codigo; })[0];
  hoja.getRange(fila._fila, columna(entorno, 'PRECIOS', 'Precio público sugerido')).setValue(precio);
}

function pedido(datos) {
  return Object.assign({ fechaEntrega: HOY, envio: 0, totalCobrado: null, origen: '', notas: '' }, datos);
}

test('circuito completo en la planilla', async function (t) {
  var entorno = simulador.crearEntorno({ ahora: AHORA, noEncontradas: ['Inexistente'] });
  var g = entorno.g;
  prepararPlanilla(entorno);
  var antes = ['INICIO', 'COSTOS', 'PROMOS', 'STOCK'].map(function (n) { return JSON.stringify(entorno.planilla.getSheetByName(n).matriz()); });

  await t.test('instalar crea las pestañas sin tocar las que ya existen', function () {
    var informe = g.instalar();
    assert.match(informe, /Instalación lista/);
    ['CONFIG', 'PRECIOS', 'PROMOS VIGENTES', 'ZONAS', 'CLIENTES', 'PEDIDOS', 'PEDIDOS_ITEMS', 'GASTOS', 'CIERRE', 'HISTÓRICO', 'AVISOS']
      .forEach(function (n) { assert.ok(entorno.planilla.getSheetByName(n), 'falta ' + n); });
    var despues = ['INICIO', 'COSTOS', 'PROMOS', 'STOCK'].map(function (n) { return JSON.stringify(entorno.planilla.getSheetByName(n).matriz()); });
    assert.deepEqual(despues, antes);

    var config = tabla(entorno, 'CONFIG');
    var mapa = {};
    config.forEach(function (f) { mapa[f.Clave] = f.Valor; });
    assert.equal(mapa['Porcentaje Agustín'], '70%');
    assert.equal(mapa['Hora de corte para entrega en el día'], '11:30'); // queda como texto, no como hora
    assert.equal(mapa['ID planilla de clientes a importar'], '');
    assert.equal(mapa['ID planilla de ventas a importar'], '');
    assert.match(mapa['Dirección del local'], /Camino Gral\. Belgrano 3124, Berazategui/);

    var precios = tabla(entorno, 'PRECIOS');
    assert.deepEqual(precios.map(function (f) { return f['Código']; }), ['H-B1', 'H-B2', 'G-MED', 'G-PAT', 'P-BAST', 'Q-FRESCO', 'A-HAR', 'A-RAL']);
    assert.ok(precios.every(function (f) { return f['Precio público sugerido'] === ''; }));
    assert.equal(precios.filter(function (f) { return f['Código'] === 'Q-FRESCO'; })[0]['Paso del + y −'], 0.5);

    var promos = tabla(entorno, 'PROMOS VIGENTES');
    var cabezas = promos.filter(function (f) { return f['Código promo']; });
    assert.deepEqual(cabezas.map(function (f) { return [f.Nombre, f.Precio, f.Activa, f.Revisar]; }), [
      ['PROMO FULL', 29900, 'sí', 'a revisar'], ['PROMO 1', 32900, 'sí', 'a revisar'], ['PROMO 2', 35900, 'sí', 'a revisar']]);
    assert.equal(promos.filter(function (f) { return f.Promo; }).length, 11 + 4 + 4);
    assert.ok(promos.some(function (f) { return f.Promo === 'PROMO-FULL' && f['Código producto'] === 'Q-FRESCO' && f.Cantidad === 0.5; }));
    // La PROMO FULL lleva maple B2 (no B1).
    var full = promos.filter(function (f) { return f.Promo === 'PROMO-FULL'; });
    assert.ok(full.some(function (f) { return f['Código producto'] === 'H-B2' && f.Cantidad === 1; }));
    assert.ok(!full.some(function (f) { return f['Código producto'] === 'H-B1'; }));

    var zonas = tabla(entorno, 'ZONAS');
    assert.equal(zonas.length, 16);
    assert.equal(zonas.filter(function (z) { return z['¿Llegamos?'] === 'consultar'; }).length, 2);

    var avisos = tabla(entorno, 'AVISOS');
    assert.ok(avisos.some(function (a) { return a.Tipo === 'Costo faltante' && a['Código'] === 'A-RAL'; }));
    assert.ok(avisos.some(function (a) { return a.Tipo === 'Precio vacío'; }));
    assert.ok(avisos.some(function (a) { return a.Tipo === 'Promo a revisar' && a['Código'] === 'PROMO-FULL'; }));
    // PROMO FULL usa productos que no están en COSTOS: costo faltante, no inventado.
    assert.ok(avisos.some(function (a) { return a.Tipo === 'Costo faltante' && a['Código'] === 'PROMO-FULL'; }));

    var hojaPedidos = entorno.planilla.getSheetByName('PEDIDOS');
    assert.equal(hojaPedidos.getRange(2, columna(entorno, 'PEDIDOS', 'Teléfono')).getNumberFormat(), '@');
    assert.equal(hojaPedidos.congeladas, 1);
  });

  await t.test('instalar dos veces no duplica nada', function () {
    var cuentas = function () {
      return ['CONFIG', 'PRECIOS', 'PROMOS VIGENTES', 'ZONAS'].map(function (n) { return tabla(entorno, n).length; });
    };
    var antes2 = cuentas();
    g.instalar();
    assert.deepEqual(cuentas(), antes2);
  });

  await t.test('con precios cargados, obtenerDatos devuelve todo listo para el celu', function () {
    ponerPrecio(entorno, 'H-B1', 7000);
    ponerPrecio(entorno, 'G-MED', '$ 4.000');
    ponerPrecio(entorno, 'Q-FRESCO', 9000);
    ponerPrecio(entorno, 'A-HAR', 1000);
    ponerPrecio(entorno, 'P-BAST', 5000);
    var d = g.obtenerDatos();
    assert.equal(JSON.stringify(JSON.parse(JSON.stringify(d))), JSON.stringify(d)); // sin fechas ni cosas raras
    assert.equal(d.hoy, HOY);
    assert.equal(d.config.porcentajeAgustin, 0.7);
    assert.equal(d.config.horaCorte, '11:30');
    var porCodigo = {};
    d.catalogo.items.forEach(function (i) { porCodigo[i.codigo] = i; });
    assert.equal(porCodigo['G-MED'].precio, 4000);
    assert.equal(porCodigo['H-B2'].costo, 4500);
    assert.equal(porCodigo['H-B1'].costo, 5000); // de "Costo unitario base" (G), no de "Costo compra" (D)
    assert.equal(porCodigo['PROMO-1'].costo, 4500 + 3000 + 3500 + 6000);
    assert.equal(porCodigo['PROMO-1'].revisar, true);
  });

  var idAna = 'P20261005-AAAAA';
  await t.test('nuevo pedido: se guarda una vez, con teléfono como texto y cliente nuevo', function () {
    var r = g.guardarPedido(pedido({
      id: idAna, telefono: '15 5555-0001', cliente: 'Ana Prueba', direccion: 'Calle 14 1234', barrio: 'Hudson',
      referencia: 'portón rojo', lineas: [{ codigo: 'H-B1', cantidad: 2 }, { codigo: 'PROMO-1', cantidad: 1, precioUnitario: null }], origen: 'Pedix'
    }));
    assert.equal(r.pedido.telefono, '+5491155550001');
    assert.equal(r.pedido.vuelta, '1ra');
    assert.equal(r.pedido.totalCobrado, 14000 + 32900);
    var filas = tabla(entorno, 'PEDIDOS');
    assert.equal(filas.length, 1);
    assert.equal(filas[0]['Teléfono'], '+5491155550001'); // texto, no número
    assert.equal(Object.prototype.toString.call(filas[0]['Fecha de entrega']), '[object Date]');
    assert.equal(simulador.formatearFecha(filas[0]['Fecha de entrega'], simulador.TZ, 'yyyy-MM-dd'), HOY);
    assert.equal(filas[0].Costo, 10000 + 17000);
    assert.equal(filas[0].Estado, 'confirmado');
    assert.equal(filas[0]['ID pedido'], idAna);
    assert.equal(tabla(entorno, 'PEDIDOS_ITEMS').length, 2);
    var clientes = tabla(entorno, 'CLIENTES');
    assert.equal(clientes.length, 1);
    assert.equal(clientes[0]['Teléfono'], '+5491155550001');
    assert.equal(clientes[0]['Origen de la primera compra'], 'Pedix');
    assert.equal(clientes[0].Referencia, 'portón rojo');
    assert.equal(clientes[0]['Cantidad de compras'], 0);
  });

  await t.test('editar el pedido no duplica filas y reemplaza los productos', function () {
    g.guardarPedido(pedido({
      id: idAna, telefono: '+5491155550001', cliente: 'Ana Prueba', direccion: 'Calle 14 1234', barrio: 'Hudson',
      lineas: [{ codigo: 'H-B1', cantidad: 3 }], totalCobrado: 21000
    }));
    assert.equal(tabla(entorno, 'PEDIDOS').length, 1);
    var items = tabla(entorno, 'PEDIDOS_ITEMS');
    assert.equal(items.length, 1);
    assert.equal(items[0].Cantidad, 3);
    assert.equal(items[0]['Precio unitario'], 7000);
    assert.equal(items[0]['Costo unitario'], 5000);
  });

  await t.test('cobrado → entregado y CLIENTES se actualiza solo', function () {
    var r = g.actualizarPedido(idAna, { medio: 'Efectivo' });
    assert.equal(r.pedido.estado, 'entregado');
    assert.equal(r.pedido.lineas.length, 1);
    var c = tabla(entorno, 'CLIENTES')[0];
    assert.equal(c['Cantidad de compras'], 1);
    assert.equal(c['Total gastado'], 21000);
    assert.equal(simulador.formatearFecha(c['Última compra'], simulador.TZ, 'yyyy-MM-dd'), HOY);
    assert.equal(simulador.formatearFecha(c['Primera compra'], simulador.TZ, 'yyyy-MM-dd'), HOY);
  });

  await t.test('mayorista: 6 maples sin precio quedan sin precio sugerido', function () {
    var r = g.guardarPedido(pedido({ id: 'P20261005-MAYOR', telefono: '1155550009', cliente: 'Mayorista', direccion: 'Mitre 900',
      lineas: [{ codigo: 'H-B1', cantidad: 6, precioUnitario: 6500 }] }));
    assert.equal(r.pedido.totalCobrado, 39000);
    var sinPrecio = g.guardarPedido(pedido({ id: 'P20261005-MAYO2', telefono: '1155550009', cliente: 'Mayorista', direccion: 'Mitre 900',
      lineas: [{ codigo: 'H-B1', cantidad: 6 }] }));
    assert.match(sinPrecio.avisos.join(' '), /sin precio/);
    g.actualizarPedido('P20261005-MAYOR', { estado: 'cancelado' });
    g.actualizarPedido('P20261005-MAYO2', { estado: 'cancelado' });
  });

  await t.test('ordenar ruta: optimiza, manda al final lo que no encuentra y lo sin dirección', function () {
    g.guardarPedido(pedido({ id: 'P20261005-BBBBB', telefono: '1155550002', cliente: 'Beto', direccion: 'Calle Inexistente 999', lineas: [{ codigo: 'A-HAR', cantidad: 2 }] }));
    g.guardarPedido(pedido({ id: 'P20261005-CCCCC', telefono: '1155550003', cliente: 'Caro', direccion: 'Belgrano 300', barrio: 'Ranelagh', lineas: [{ codigo: 'Q-FRESCO', cantidad: 0.5 }] }));
    g.guardarPedido(pedido({ id: 'P20261005-DDDDD', telefono: '1155550004', cliente: 'Dani', direccion: '', lineas: [{ codigo: 'G-MED', cantidad: 1 }] }));
    g.guardarPedido(pedido({ id: 'P20261005-EEEEE', telefono: '1155550005', cliente: 'Eli', direccion: 'San Martín 50', barrio: 'Hudson', lineas: [{ codigo: 'P-BAST', cantidad: 1 }] }));
    var r = g.ordenarRuta(HOY, 'todas');
    assert.equal(r.ordenados, 4);
    assert.ok(r.avisos.some(function (a) { return /No encontré.*Beto/.test(a); }));
    assert.ok(r.avisos.some(function (a) { return /Sin dirección completa: Dani/.test(a); }));
    var orden = {};
    tabla(entorno, 'PEDIDOS').forEach(function (p) { orden[p.Cliente] = p['Orden en la ruta']; });
    // Lo resuelto primero (Ana entregada y los cancelados), después Eli y Caro (orden inverso del simulador), y al final Beto y Dani.
    assert.ok(orden['Ana Prueba'] < orden.Eli);
    assert.ok(orden.Eli < orden.Caro);
    assert.ok(orden.Caro < orden.Beto);
    assert.ok(orden.Beto < orden.Dani);
    assert.equal(entorno.registro.paradas[0].length, 2);
    assert.ok(entorno.registro.geocodificadas.some(function (d) { return d === 'Belgrano 300, Ranelagh, Buenos Aires, Argentina'; }));
  });

  await t.test('hoja de reparto: PDF en Drive y lo que entra después va a la 2da vuelta', function () {
    var r = g.generarHoja(HOY, '1ra');
    assert.equal(r.cantidad, 4);
    assert.equal(r.nombre, 'Hoja de reparto ' + HOY + ' 1ra vuelta.pdf');
    var carpeta = entorno.carpetas[0];
    assert.equal(carpeta.nombre, 'Llegamos - Hojas de reparto');
    var archivo = carpeta.archivos[0];
    assert.equal(archivo.blob.tipo, 'application/pdf');
    var html = archivo.blob.contenido;
    assert.match(html, /Eli/);
    assert.match(html, /CARGA/);
    assert.match(html, /PENDIENTES — sin dirección completa/);
    assert.match(html, /Dani/);
    assert.match(html, /https:\/\/www\.google\.com\/maps\/dir\/\?api=1&amp;origin=/);
    assert.match(html, /11 5555-0005/);
    assert.match(html, /QUESOS/);
    assert.ok(entorno.propiedades['hojaImpresa:' + HOY]);
    // La hoja vuelve a generarse: la anterior va a la papelera.
    g.generarHoja(HOY, '1ra');
    assert.equal(carpeta.archivos.filter(function (a) { return !a.borrado; }).length, 1);
    var nuevo = g.guardarPedido(pedido({ id: 'P20261005-FFFFF', telefono: '1155550006', cliente: 'Fede', direccion: 'Calle 9 900', lineas: [{ codigo: 'A-HAR', cantidad: 1 }] }));
    assert.equal(nuevo.pedido.vuelta, '2da');
    var segunda = g.generarHoja(HOY, '2da');
    assert.equal(segunda.cantidad, 1);
  });

  await t.test('venta en ruta sin teléfono: queda en el día, sin crear cliente', function () {
    var antesClientes = tabla(entorno, 'CLIENTES').length;
    var r = g.guardarPedido({ id: 'P20261005-RUTA1', enRuta: true, fechaEntrega: HOY, telefono: '', cliente: '', lineas: [{ codigo: 'H-B1', cantidad: 1 }],
      totalCobrado: 7500, envio: 0, origen: '', estado: 'entregado', medio: 'Mercado Pago' });
    assert.equal(r.pedido.vuelta, 'en ruta');
    assert.equal(r.pedido.cliente, 'Sin nombre');
    assert.equal(r.pedido.origen, 'En ruta');
    assert.equal(tabla(entorno, 'CLIENTES').length, antesClientes);
  });

  await t.test('gastos y cierre del día', function () {
    g.guardarGasto({ id: 'G1', fecha: HOY, descripcion: 'Nafta', monto: '2.000' }); // sin elegir = lo paga el local
    g.guardarGasto({ id: 'G2', fecha: HOY, descripcion: 'Bolsas', monto: 1000, quienPaga: 'lo paga el local' });
    g.guardarGasto({ id: 'G3', fecha: HOY, descripcion: 'Error', monto: 1, quienPaga: 'se reparte entre los dos' });
    g.borrarGasto('G3');
    var gastos = tabla(entorno, 'GASTOS');
    assert.equal(gastos.length, 2);
    assert.deepEqual(gastos.map(function (x) { return x['Quién lo paga']; }), ['lo paga el local', 'lo paga el local']);
    g.actualizarPedido('P20261005-CCCCC', { medio: 'Mercado Pago' });
    g.actualizarPedido('P20261005-EEEEE', { estado: 'entregado' }); // sin cobrar
    g.actualizarPedido('P20261005-BBBBB', { estado: 'no estaba' });
    var r = g.cerrarDia(HOY, '$ 20.000');
    // Ana 21000 (costo 15000) + Caro 4500 (costo 3000) + Eli 5000 (costo 3500) + ruta 7500 (costo 5000)
    assert.equal(r.entregados, 4);
    assert.equal(r.ventas, 38000);
    assert.equal(r.costo, 26500);
    assert.equal(r.ganancia, 11500);
    assert.equal(r.agustin, 8050);
    assert.equal(r.local, 3450);
    assert.equal(r.gastosLocal, 3000);
    assert.equal(r.leQuedaLocal, 450);
    assert.equal(r.retiroCalculado, 8050); // el 70% completo
    assert.equal(r.diferencia, 20000 - 8050);
    assert.equal(r.pendienteCobro, 5000);
    assert.deepEqual(Array.from(r.sinEstadoFinal, function (p) { return p.cliente; }).sort(), ['Dani', 'Fede']);
    var hist = tabla(entorno, 'HISTÓRICO');
    assert.equal(hist.length, 1);
    assert.equal(hist[0]['Cobrado Efectivo'], 21000);
    assert.equal(hist[0]['Cobrado Mercado Pago'], 12000);
    assert.equal(hist[0].Ganancia, 11500);
    assert.equal(hist[0]['Agustín 70%'], 8050);
    assert.equal(hist[0]['Local 30%'], 3450);
    assert.equal(hist[0]['Gastos que paga el local'], 3000);
    assert.equal(hist[0]['Le queda al local'], 450);
    assert.equal(hist[0]['Retiro calculado'], 8050);
    assert.match(hist[0]['Detalle de gastos'], /Nafta \$ 2\.000 \(local\)/);
    var cierre = entorno.planilla.getSheetByName('CIERRE').matriz();
    assert.match(cierre[0][0], /^CIERRE DEL DÍA — lunes 5 de octubre 2026/);
    function filaCierre(texto) { return cierre.filter(function (f) { return f[0] === texto; })[0]; }
    assert.equal(filaCierre('Ganancia (ventas − costo de mercadería)')[1], 11500);
    assert.equal(filaCierre('Local 30%')[1], 3450);
    assert.equal(filaCierre('Gastos que paga el local')[1], 3000);
    assert.equal(filaCierre('Le queda al local')[1], 450);
    assert.equal(filaCierre('Retiro calculado (Agustín 70% completo)')[1], 8050);
    assert.ok(cierre.some(function (f) { return f[0] === 'Nafta' && f[2] === 'lo paga el local'; }));
    assert.ok(cierre.some(function (f) { return /Quedaron sin marcar/.test(f[0]); }));
    // Cerrar de nuevo reemplaza la fila del día.
    g.cerrarDia(HOY, '');
    hist = tabla(entorno, 'HISTÓRICO');
    assert.equal(hist.length, 1);
    assert.equal(hist[0]['Retiro real'], '');
  });

  await t.test('importar clientes desde la planilla de CONFIG, sin duplicar', function () {
    var otra = entorno.otraPlanilla('id-de-prueba-clientes-0000000000', 'Contactos');
    otra.cargarHoja('contacts', [
      ['Given Name', 'Family Name', 'Phone 1 - Value', 'Address 1 - Formatted', 'Notes'],
      ['Gabi', 'X', '+54 9 11 5555-0010', 'Calle 20 2000\nVilla España\nBuenos Aires', 'casa con rejas'],
      ['Ana otra vez', '', '11 5555 0001', '', ''],
      ['Sin teléfono', '', '', '', ''],
      ['Hugo', '', '15 5555-0011 ::: 11 5555-0012', '', 'cliente viejo']
    ]);
    ponerConfig(entorno, 'ID planilla de clientes a importar', 'https://docs.google.com/spreadsheets/d/id-de-prueba-clientes-0000000000/edit');
    var antesN = tabla(entorno, 'CLIENTES').length;
    var msg = g.importarClientes();
    assert.match(msg, /Nuevos: 2/);
    assert.match(msg, /Sin teléfono válido \(no se importaron\): 1/);
    var clientes = tabla(entorno, 'CLIENTES');
    assert.equal(clientes.length, antesN + 2);
    var gabi = clientes.filter(function (c) { return c.Nombre === 'Gabi'; })[0];
    assert.equal(gabi['Teléfono'], '+5491155550010');
    assert.equal(gabi.Barrio, 'Villa España');
    assert.equal(gabi['Calle y altura'], 'Calle 20 2000');
    assert.match(g.importarClientes(), /Nuevos: 0/);
    assert.equal(tabla(entorno, 'CLIENTES').length, antesN + 2);
  });

  await t.test('importar ventas de octubre: pedidos entregados, sin duplicar', function () {
    var otra = entorno.otraPlanilla('id-de-prueba-ventas-00000000000', 'Ventas viejas');
    otra.cargarHoja('Resumen', [['nada']]);
    otra.cargarHoja('Ventas', [
      ['Fecha', 'Cliente', 'Zona', 'Producto/promo', 'Detalle', 'Precio cobrado', 'Costo', 'Ganancia', 'Medio de pago', 'Nota'],
      [new Date('2026-10-01T15:00:00Z'), 'Gabi', 'Villa España', 'PROMO 1', '', '$32.900,00', '$17.000,00', '$15.900,00', 'MP', ''],
      ['02/10/2026', 'Sin nombre', 'Hudson', 'Huevo blanco N°1', '2 maples', 14000, 10000, 4000, 'Efectivo', 'dictado'],
      ['02/10/2026', 'Iván 11 5555', '', 'Algo raro', '', 3000, '', 1000, 'efvo', ''],
      ['02/10/2026', 'Juli 11 5555-0013', '', 'PROMO 2', '', 35900, '', '', 'Transferencia', ''],
      ['', '', '', '', '', '', '', '', '', '']
    ]);
    ponerConfig(entorno, 'ID planilla de ventas a importar', 'id-de-prueba-ventas-00000000000');
    var antesP = tabla(entorno, 'PEDIDOS').length;
    var msg = g.importarVentasOctubre();
    assert.match(msg, /Nuevas: 4 \(sin teléfono: 2\)/);
    var pedidos = tabla(entorno, 'PEDIDOS');
    assert.equal(pedidos.length, antesP + 4);
    var importados = pedidos.filter(function (p) { return /^IMP-/.test(p['ID pedido']); });
    assert.ok(importados.every(function (p) { return p.Estado === 'entregado'; }));
    var gabi = importados.filter(function (p) { return p.Cliente === 'Gabi'; })[0];
    assert.equal(gabi['Teléfono'], '+5491155550010'); // tomado de CLIENTES por el nombre
    assert.equal(gabi['Medio de pago'], 'Mercado Pago');
    assert.equal(simulador.formatearFecha(gabi['Fecha de entrega'], simulador.TZ, 'yyyy-MM-dd'), '2026-10-01');
    var ivan = importados.filter(function (p) { return p.Cliente === 'Iván'; })[0];
    assert.match(ivan.Notas, /Teléfono incompleto/);
    assert.equal(ivan.Costo, 2000);
    assert.equal(ivan['Medio de pago'], 'Efectivo');
    var juli = importados.filter(function (p) { return p.Cliente === 'Juli'; })[0];
    assert.equal(juli['Teléfono'], '+5491155550013');
    assert.equal(juli['Costo incompleto'], 'sí');
    // Juli no estaba en CLIENTES: se crea con sus compras.
    var cJuli = tabla(entorno, 'CLIENTES').filter(function (c) { return c['Teléfono'] === '+5491155550013'; })[0];
    assert.equal(cJuli['Cantidad de compras'], 1);
    var cGabi = tabla(entorno, 'CLIENTES').filter(function (c) { return c['Teléfono'] === '+5491155550010'; })[0];
    assert.equal(cGabi['Total gastado'], 32900);
    assert.match(g.importarVentasOctubre(), /Nuevas: 0[\s\S]*Ya estaban importadas: 4/);
    assert.equal(tabla(entorno, 'PEDIDOS').length, antesP + 4);
  });

  await t.test('la web app: una sola carga, lógica incluida y JavaScript válido', function () {
    var salida = g.doGet();
    var html = salida.getContent();
    assert.equal(salida.titulo, 'Llegamos! · Avícola Belgrano');
    assert.ok(salida.metas.some(function (m) { return m[0] === 'viewport'; }));
    assert.match(html, /var Logica = \(function crearLogica_\(\)/);
    plantillas.scriptsDeHtml(html).forEach(function (js, i) {
      assert.doesNotThrow(function () { new vm.Script(js, { filename: 'App script ' + (i + 1) }); });
    });
    var m = /var DATOS_INICIALES = (.*);\nvar ERROR_INICIAL = (.*);/.exec(html);
    var datos = JSON.parse(m[1]);
    assert.equal(JSON.parse(m[2]), '');
    assert.ok(datos.pedidos.length > 0);
    assert.ok(datos.ultimos['+5491155550001']);
    assert.ok(datos.clientes.some(function (c) { return c.telefono === '+5491155550010'; }));
  });

  await t.test('menú Avícola y avisos', function () {
    g.onOpen();
    var items = entorno.registro.menu.filter(function (x) { return x[0] !== '__menu__'; }).map(function (x) { return x[0]; });
    assert.deepEqual(items, ['Instalar', 'Abrir web app', 'Ordenar ruta', 'Hoja de reparto', 'Cerrar el día',
      'Recalcular recompra', 'Recalcular tablero', 'Importar clientes', 'Importar ventas de octubre', 'Actualizar avisos']);
    g.abrirWebApp();
    assert.match(entorno.registro.alertas.pop(), /Todavía no publicaste la web app/);
    g.instalarDesdeMenu();
    assert.match(entorno.registro.alertas.pop(), /Instalación lista/);
    g.hojaDesdeMenu();
    assert.equal(entorno.registro.dialogos.pop()[0], 'Hoja de reparto');
    var avisos = g.actualizarAvisos();
    assert.ok(avisos.length > 0);
    assert.equal(tabla(entorno, 'AVISOS').length, avisos.length);
  });
});

test('la web app avisa si todavía no se instaló', function () {
  var entorno = simulador.crearEntorno({ ahora: AHORA });
  var html = entorno.g.doGet().getContent();
  assert.match(html, /var DATOS_INICIALES = null;/);
  assert.match(html, /Falta la pestaña CONFIG/);
});

test('cerrar el día desde el menú pregunta si quedan pedidos sin marcar', function () {
  var entorno = simulador.crearEntorno({ ahora: AHORA, respuestaPrompt: '1000' });
  prepararPlanilla(entorno);
  entorno.g.instalar();
  entorno.g.guardarPedido(pedido({ id: 'P1', telefono: '1155550001', cliente: 'Ana', direccion: 'Mitre 1', lineas: [{ codigo: 'H-B1', cantidad: 1, precioUnitario: 7000 }] }));
  entorno.g.cerrarDiaDesdeMenu();
  var alertas = entorno.registro.alertas;
  assert.match(alertas[0], /Quedan 1 pedido\(s\) sin marcar/);
  assert.match(alertas[1], /Día cerrado/);
  assert.match(alertas[1], /Le queda al local/);
});
