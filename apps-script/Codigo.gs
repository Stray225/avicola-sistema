/**
 * Codigo.gs — Llegamos! / Avícola Belgrano
 *
 * Todo lo que toca Google: menú, instalación, lectura y escritura de la planilla,
 * ruta con Google Maps, PDF de la hoja de reparto, cierre e importaciones,
 * y las funciones que llama la web app (App.html).
 *
 * Las cuentas (precios, costos, cierre, teléfonos, fechas) están en Logica.gs.
 * Nada de precios, zonas ni textos de mensajes acá: se leen de las pestañas.
 * La única excepción son los valores iniciales de semillas_(), que instalar()
 * escribe UNA sola vez cuando crea una pestaña; después mandan las pestañas.
 */

var HOJAS = {
  COSTOS: 'COSTOS',
  CONFIG: 'CONFIG',
  PRECIOS: 'PRECIOS',
  PROMOS: 'PROMOS VIGENTES',
  ZONAS: 'ZONAS',
  CLIENTES: 'CLIENTES',
  PEDIDOS: 'PEDIDOS',
  ITEMS: 'PEDIDOS_ITEMS',
  GASTOS: 'GASTOS',
  CIERRE: 'CIERRE',
  HISTORICO: 'HISTÓRICO',
  AVISOS: 'AVISOS'
};

// Columnas de cada pestaña: [campo interno, encabezado en la planilla, tipo].
// Se leen y escriben por el nombre del encabezado, así se pueden mover columnas.
var ESQUEMAS = {
  COSTOS: [
    ['codigo', 'Código', 'texto'],
    ['producto', 'Producto', 'texto'],
    ['unidadBase', 'Unidad base', 'texto'],
    ['costo', 'Costo unitario base', 'crudo'],
    ['categoria', 'Categoría', 'texto']
  ],
  CONFIG: [
    ['clave', 'Clave', 'texto'],
    ['valor', 'Valor', 'texto'],
    ['ayuda', 'Para qué sirve', 'texto']
  ],
  PRECIOS: [
    ['codigo', 'Código', 'texto'],
    ['nombre', 'Nombre corto', 'texto'],
    ['unidad', 'Unidad de venta', 'texto'],
    ['precio', 'Precio público sugerido', 'pesos'],
    ['base', 'Unidades base por unidad de venta', 'numero'],
    ['paso', 'Paso del + y −', 'numero'],
    ['activo', 'Activo', 'texto']
  ],
  PROMOS: [
    ['codigo', 'Código promo', 'texto'],
    ['nombre', 'Nombre', 'texto'],
    ['precio', 'Precio', 'pesos'],
    ['activa', 'Activa', 'texto'],
    ['revisar', 'Revisar', 'texto'],
    ['_separador', '', 'texto'],
    ['compPromo', 'Promo', 'texto'],
    ['compCodigo', 'Código producto', 'texto'],
    ['compCantidad', 'Cantidad', 'numero']
  ],
  ZONAS: [
    ['barrio', 'Barrio', 'texto'],
    ['llegamos', '¿Llegamos?', 'texto'],
    ['notas', 'Notas', 'texto']
  ],
  CLIENTES: [
    ['telefono', 'Teléfono', 'telefono'],
    ['nombre', 'Nombre', 'texto'],
    ['direccion', 'Calle y altura', 'texto'],
    ['entreCalles', 'Entre calles', 'texto'],
    ['barrio', 'Barrio', 'texto'],
    ['referencia', 'Referencia', 'texto'],
    ['primeraCompra', 'Primera compra', 'fecha'],
    ['ultimaCompra', 'Última compra', 'fecha'],
    ['cantidadCompras', 'Cantidad de compras', 'numero'],
    ['totalGastado', 'Total gastado', 'pesos'],
    ['origenPrimera', 'Origen de la primera compra', 'texto'],
    ['notas', 'Notas', 'texto'],
    ['alta', 'Alta', 'fechahora']
  ],
  PEDIDOS: [
    ['id', 'ID pedido', 'texto'],
    ['fechaCarga', 'Fecha de carga', 'fechahora'],
    ['fechaEntrega', 'Fecha de entrega', 'fecha'],
    ['vuelta', 'Vuelta', 'texto'],
    ['orden', 'Orden en la ruta', 'numero'],
    ['telefono', 'Teléfono', 'telefono'],
    ['cliente', 'Cliente', 'texto'],
    ['direccion', 'Dirección', 'texto'],
    ['entreCalles', 'Entre calles', 'texto'],
    ['barrio', 'Barrio', 'texto'],
    ['referencia', 'Referencia', 'texto'],
    ['horario', 'Horario pedido', 'texto'],
    ['totalSugerido', 'Total sugerido', 'pesos'],
    ['totalCobrado', 'Total cobrado', 'pesos'],
    ['envio', 'Envío cobrado', 'pesos'],
    ['costo', 'Costo', 'pesos'],
    ['ganancia', 'Ganancia', 'pesos'],
    ['origen', 'Origen', 'texto'],
    ['estado', 'Estado', 'texto'],
    ['medio', 'Medio de pago', 'texto'],
    ['notas', 'Notas', 'texto'],
    ['detalle', 'Detalle', 'texto'],
    ['costoIncompleto', 'Costo incompleto', 'texto'],
    ['actualizado', 'Actualizado', 'fechahora']
  ],
  ITEMS: [
    ['pedido', 'ID pedido', 'texto'],
    ['codigo', 'Código', 'texto'],
    ['cantidad', 'Cantidad', 'numero'],
    ['precioUnitario', 'Precio unitario', 'pesos'],
    ['costoUnitario', 'Costo unitario', 'pesos'],
    ['descripcion', 'Descripción', 'texto']
  ],
  GASTOS: [
    ['id', 'ID gasto', 'texto'],
    ['fecha', 'Fecha', 'fecha'],
    ['descripcion', 'Descripción', 'texto'],
    ['monto', 'Monto', 'pesos'],
    ['quienPaga', 'Quién lo paga', 'texto']
  ],
  HISTORICO: [
    ['fecha', 'Fecha', 'fecha'],
    ['entregados', 'Pedidos entregados', 'numero'],
    ['noEstaban', 'No estaban', 'numero'],
    ['ventas', 'Ventas', 'pesos'],
    ['costo', 'Costo de mercadería', 'pesos'],
    ['ganancia', 'Ganancia', 'pesos'],
    ['margen', 'Margen', 'porcentaje'],
    ['agustin', 'Agustín', 'pesos'], // el encabezado lleva el porcentaje de CONFIG: ver esquemaHistorico_()
    ['local', 'Local', 'pesos'],
    ['gastosLocal', 'Gastos que paga el local', 'pesos'],
    ['gastosCompartidos', 'Gastos que se reparten', 'pesos'],
    ['leQuedaLocal', 'Le queda al local', 'pesos'],
    ['retiroCalculado', 'Retiro calculado', 'pesos'],
    ['retiroReal', 'Retiro real', 'pesos'],
    ['diferencia', 'Diferencia', 'pesos'],
    ['pendienteCobro', 'Pendiente de cobro', 'pesos'],
    ['costosFaltantes', 'Costos faltantes', 'texto'],
    ['detalleGastos', 'Detalle de gastos', 'texto'],
    ['cerrado', 'Cerrado el', 'fechahora']
  ],
  AVISOS: [
    ['tipo', 'Tipo', 'texto'],
    ['codigo', 'Código', 'texto'],
    ['nombre', 'Nombre', 'texto'],
    ['detalle', 'Detalle', 'texto'],
    ['actualizado', 'Actualizado', 'fechahora']
  ]
};

var VERDE_OSCURO = '#1b5e20';
var CACHE_ = {};

/**
 * Valores iniciales. instalar() los escribe solo cuando crea la pestaña (o cuando falta una fila
 * de CONFIG). El resto del código nunca los usa: todo se lee de la planilla.
 */
function semillas_() {
  var C = Logica.CLAVES_CONFIG;
  return {
    config: [
      [C.nombreNegocio, 'Llegamos! · Avícola Belgrano', 'Aparece arriba en la app y en la hoja de reparto.'],
      [C.direccionLocal, 'Camino Gral. Belgrano 3124, Berazategui, Buenos Aires, Argentina', 'De acá sale y acá vuelve la ruta.'],
      [C.porcentajeAgustin, '70%', 'Parte de la ganancia (ventas − costo de mercadería) para Agustín. No se le descuenta ningún gasto.'],
      [C.porcentajeLocal, '30%', 'Parte de la ganancia para el local. De acá se descuentan los gastos que paga el local.'],
      [C.margenMinimo, '20%', 'Si un producto o promo deja menos que esto, aparece en AVISOS.'],
      [C.mediosPago, 'Efectivo, Mercado Pago, Transferencia', 'Separados por coma. Cada uno es un botón "Cobrado…" en HOY.'],
      [C.origenes, 'Anuncio PROMO FULL, Anuncio otra promo, Pedix, Recompra, Boca en boca, Local, En ruta', 'De dónde vino el pedido. Separados por coma.'],
      [C.origenEnRuta, 'En ruta', 'Origen que se pone solo en las ventas en ruta.'],
      [C.horaCorte, '11:30', 'Lo que entra antes de esta hora (lunes a sábado) sale hoy; si no, el día hábil siguiente.'],
      [C.diasSinReparto, '', 'Feriados o días que no salís: fechas dd/mm/aaaa separadas por coma. Los domingos ya se saltean.'],
      [C.umbralMayorista, '6', 'Desde esta cantidad de maples la app no sugiere precio: lo ponés vos.'],
      [C.envioPorDefecto, '0', 'Lo que se cobra de envío si no decís otra cosa.'],
      [C.caracteristica, '11', 'Para pasar "15 1234-5678" a +54 9 11 1234-5678.'],
      [C.localidadPorDefecto, 'Berazategui', 'Se usa para encontrar la dirección en el mapa si no hay barrio.'],
      [C.sufijoDirecciones, 'Buenos Aires, Argentina', 'Se agrega al final de cada dirección para que Google Maps la encuentre.'],
      [C.paradasPorLink, '9', 'Paradas intermedias por link de ruta. Si el link te corta paradas, bajalo a 3.'],
      [C.ordenCategorias, 'Huevos, Congelados, Quesos, Almacén', 'Orden de la CARGA en la hoja. Tienen que coincidir con la "Categoría" de COSTOS.'],
      [C.carpetaHojas, 'Llegamos - Hojas de reparto', 'Carpeta de tu Drive donde se guardan los PDF.'],
      [C.whatsappBusiness, 'no', 'Poné "sí" si los botones te abren el WhatsApp personal en vez del Business (solo Android).'],
      [C.mensajeAvisoVoy, '¡Hola {nombre}! En 15 minutos estoy por tu casa con el pedido 🚚', 'Botón "Avisar que voy". Podés usar {nombre}, {total}, {detalle}, {direccion}, {fecha}.'],
      [C.mensajeNoEstaba, '¡Hola {nombre}! Pasé con tu pedido y no te encontré 😕 ¿Cuándo te queda bien que vuelva?', 'Botón "No estaba".'],
      [C.mensajeConfirmacion, '¡Hola {nombre}! Te confirmo el pedido: {detalle}. Total {total}. Te lo llevo {fecha} 🚚', 'Botón para confirmar después de cargar un pedido.'],
      [C.idClientesImportar, '', 'ID (o link) de la planilla de contactos para "Importar clientes".'],
      [C.idVentasImportar, '', 'ID (o link) de la planilla con la pestaña "Ventas" para "Importar ventas de octubre".']
    ],
    zonas: [
      ['Berazategui', 'sí'], ['Hudson', 'sí'], ['Plátanos', 'sí'], ['Ranelagh', 'sí'], ['Villa España', 'sí'],
      ['Sourigues', 'sí'], ['Barrio Marítimo', 'sí'],
      ['Ezpeleta', 'consultar'], ['Solano', 'consultar'],
      ['Bosques', 'no'], ['Bernal', 'no'], ['Quilmes centro', 'no'], ['Avellaneda', 'no'], ['Varela', 'no'],
      ['Lanús', 'no'], ['CABA', 'no']
    ],
    // Ejemplos pedidos por Agustín, marcados "a revisar" hasta que confirme precio y composición.
    promos: [
      { codigo: 'PROMO-FULL', nombre: 'PROMO FULL', precio: 29900, componentes: [
        ['A-HAR', 2], ['A-PUR', 2], ['A-ATU', 1], ['A-SPA', 1], ['A-TIR', 1], ['A-ARR', 1], ['A-LEV', 1],
        ['A-RAL', 1], ['A-ACE', 1], ['Q-FRESCO', 0.5], ['H-B1', 1]] },
      { codigo: 'PROMO-1', nombre: 'PROMO 1', precio: 32900, componentes: [
        ['H-B2', 1], ['G-MED', 1], ['P-BAST', 1], ['Q-FRESCO', 1]] },
      { codigo: 'PROMO-2', nombre: 'PROMO 2', precio: 35900, componentes: [
        ['H-B2', 2], ['Q-FRESCO', 1], ['G-PAT', 1], ['P-BAST', 1]] }
    ]
  };
}

// ═════════════════════════════ Menú ═════════════════════════════

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Avícola')
    .addItem('Instalar', 'instalarDesdeMenu')
    .addItem('Abrir web app', 'abrirWebApp')
    .addSeparator()
    .addItem('Ordenar ruta', 'ordenarRutaDesdeMenu')
    .addItem('Hoja de reparto', 'hojaDesdeMenu')
    .addItem('Cerrar el día', 'cerrarDiaDesdeMenu')
    .addSeparator()
    .addItem('Importar clientes', 'importarClientesDesdeMenu')
    .addItem('Importar ventas de octubre', 'importarVentasDesdeMenu')
    .addSeparator()
    .addItem('Actualizar avisos', 'actualizarAvisosDesdeMenu')
    .addToUi();
}

function alerta_(mensaje) {
  SpreadsheetApp.getUi().alert(mensaje);
}

function desdeMenu_(fn) {
  try {
    var r = fn();
    if (r) alerta_(r);
  } catch (err) {
    alerta_('⚠️ ' + mensajeError_(err));
  }
}

function instalarDesdeMenu() { desdeMenu_(instalar_); }
function importarClientesDesdeMenu() { desdeMenu_(importarClientes_); }
function importarVentasDesdeMenu() { desdeMenu_(importarVentasOctubre_); }

function actualizarAvisosDesdeMenu() {
  desdeMenu_(function () {
    var avisos = actualizarAvisos();
    return avisos.length ? 'Hay ' + avisos.length + ' aviso(s). Miralos en la pestaña AVISOS.' : 'Sin avisos. ¡Todo en orden!';
  });
}

function abrirWebApp() {
  var url = ScriptApp.getService().getUrl();
  if (!url) {
    alerta_('Todavía no publicaste la web app.\n\nEn Apps Script: Implementar → Nueva implementación → Aplicación web → Ejecutar como: Yo → Acceso: Solo yo.');
    return;
  }
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:16px;text-align:center;padding:12px">' +
    '<p><a href="' + escaparHtml_(url) + '" target="_blank" style="font-size:20px">Abrir la web app</a></p>' +
    '<p style="color:#555;font-size:13px">En el celu abrí este mismo link y agregalo a la pantalla de inicio.</p></div>'
  ).setWidth(340).setHeight(160);
  SpreadsheetApp.getUi().showModalDialog(html, 'Web app de reparto');
}

function ordenarRutaDesdeMenu() {
  desdeMenu_(function () {
    var r = ordenarRuta(ahora_().fecha, 'todas');
    return 'Listo: ' + r.ordenados + ' pedido(s) ordenados.' + (r.avisos.length ? '\n\n' + r.avisos.join('\n') : '');
  });
}

function hojaDesdeMenu() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:16px">' +
    '<p>¿Qué vuelta querés imprimir?</p>' +
    '<p><button style="font-size:16px;padding:8px 12px" onclick="ir(\'1ra\')">1ra vuelta</button> ' +
    '<button style="font-size:16px;padding:8px 12px" onclick="ir(\'2da\')">2da vuelta</button> ' +
    '<button style="font-size:16px;padding:8px 12px" onclick="ir(\'todas\')">Todo el día</button></p>' +
    '<p id="r"></p></div>' +
    '<script>function ir(v){var r=document.getElementById("r");r.textContent="Armando el PDF…";' +
    'google.script.run.withSuccessHandler(function(x){r.innerHTML=\'<a target="_blank" href="\'+x.url+\'">Abrir la hoja (\'+x.cantidad+\' pedidos)</a>\';})' +
    '.withFailureHandler(function(e){r.textContent="Error: "+e.message;}).generarHoja("",v);}</script>'
  ).setWidth(380).setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'Hoja de reparto');
}

function cerrarDiaDesdeMenu() {
  desdeMenu_(function () {
    var ui = SpreadsheetApp.getUi();
    var hoy = ahora_().fecha;
    var sinMarcar = leerPedidos_().lista.filter(function (p) {
      return p.fechaEntrega === hoy && !Logica.esEstadoFinal(p.estado);
    });
    if (sinMarcar.length) {
      var nombres = sinMarcar.map(function (p) { return '• ' + (p.cliente || 'Sin nombre'); }).join('\n');
      var resp = ui.alert('Quedan ' + sinMarcar.length + ' pedido(s) sin marcar:\n' + nombres + '\n\n¿Cerrar igual?', ui.ButtonSet.YES_NO);
      if (resp !== ui.Button.YES) return '';
    }
    var r = ui.prompt('Cerrar el día', '¿Cuánto retiraste realmente? (dejalo vacío si todavía no sabés)', ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return '';
    var c = cerrarDia(hoy, r.getResponseText());
    return 'Día cerrado ✓\n\nVentas: ' + Logica.formatearPesos(c.ventas) +
      '\nGanancia: ' + Logica.formatearPesos(c.ganancia) +
      '\nAgustín: ' + Logica.formatearPesos(c.agustin) + ' · Local: ' + Logica.formatearPesos(c.local) +
      '\nGastos que paga el local: ' + Logica.formatearPesos(c.gastosLocal) + ' · Le queda al local: ' + Logica.formatearPesos(c.leQuedaLocal) +
      '\n\nEl detalle quedó en la pestaña CIERRE y el resumen en HISTÓRICO.';
  });
}

// ═════════════════════════════ Instalación ═════════════════════════════

/** Ejecutalo una vez desde el editor de Apps Script (o desde el menú Avícola → Instalar). */
function instalar() {
  var informe = instalar_();
  console.log(informe);
  try { ss_().toast('Instalación lista. Mirá el registro de ejecución para el detalle.', 'Avícola', 8); } catch (e) { /* sin planilla abierta */ }
  return informe;
}

function instalar_() {
  var ss = ss_();
  var tz = Logica.ZONA_HORARIA;
  var informe = [];
  if (ss.getSpreadsheetTimeZone() !== tz) {
    ss.setSpreadsheetTimeZone(tz);
    informe.push('Puse la planilla en hora de Buenos Aires.');
  }
  if (Session.getScriptTimeZone() !== tz) {
    informe.push('⚠️ Falta poner la zona horaria "Buenos Aires" en Configuración del proyecto de Apps Script.');
  }
  var sem = semillas_();

  // CONFIG
  var config = asegurarHoja_(HOJAS.CONFIG, ESQUEMAS.CONFIG, informe);
  var tc = tabla_(HOJAS.CONFIG);
  var clavesExistentes = tc.filas.map(function (f) { return clave_(f[tc.idx[clave_('Clave')]]); });
  var nuevasConfig = sem.config.filter(function (r) { return clavesExistentes.indexOf(clave_(r[0])) < 0; })
    .map(function (r) { return { clave: r[0], valor: r[1], ayuda: r[2] }; });
  agregarFilas_(tc, ESQUEMAS.CONFIG, nuevasConfig);
  if (!config.creada && nuevasConfig.length) informe.push('Agregué a CONFIG: ' + nuevasConfig.map(function (r) { return r.clave; }).join(', ') + '.');
  if (config.creada) config.hoja.setColumnWidth(1, 300).setColumnWidth(2, 380).setColumnWidth(3, 480);

  // PRECIOS: un renglón por cada código de COSTOS que todavía no esté.
  var costos = leerCostos_();
  if (costos.error) informe.push('⚠️ ' + costos.error);
  var precios = asegurarHoja_(HOJAS.PRECIOS, ESQUEMAS.PRECIOS, informe, { activo: ['sí', 'no'] });
  var tpr = tabla_(HOJAS.PRECIOS);
  var codigosPrecios = objetos_(tpr, ESQUEMAS.PRECIOS).map(function (p) { return Logica.normalizarCodigo(p.codigo); });
  var nuevosPrecios = costos.filas.filter(function (c) { return codigosPrecios.indexOf(Logica.normalizarCodigo(c.codigo)) < 0; })
    .map(function (c) {
      var unidad = c.unidadBase || 'unidad';
      return { codigo: Logica.normalizarCodigo(c.codigo), nombre: c.producto, unidad: unidad, precio: '', base: 1,
        paso: /^(kg|kilo|kilos)$/.test(Logica.normalizarTexto(unidad)) ? 0.5 : 1, activo: 'sí' };
    });
  agregarFilas_(tpr, ESQUEMAS.PRECIOS, nuevosPrecios);
  if (nuevosPrecios.length) informe.push('Agregué ' + nuevosPrecios.length + ' producto(s) a PRECIOS (con el precio vacío para que lo completes).');
  if (precios.creada) precios.hoja.setColumnWidth(2, 220);

  // PROMOS VIGENTES
  var promos = asegurarHoja_(HOJAS.PROMOS, ESQUEMAS.PROMOS, informe, { activa: ['sí', 'no'] });
  if (promos.creada) {
    var filasPromo = [];
    sem.promos.forEach(function (p, i) {
      filasPromo[i] = filasPromo[i] || {};
      filasPromo[i].codigo = p.codigo;
      filasPromo[i].nombre = p.nombre;
      filasPromo[i].precio = p.precio;
      filasPromo[i].activa = 'sí';
      filasPromo[i].revisar = 'a revisar';
    });
    var k = 0;
    sem.promos.forEach(function (p) {
      p.componentes.forEach(function (c) {
        filasPromo[k] = filasPromo[k] || {};
        filasPromo[k].compPromo = p.codigo;
        filasPromo[k].compCodigo = c[0];
        filasPromo[k].compCantidad = c[1];
        k++;
      });
    });
    agregarFilas_(tabla_(HOJAS.PROMOS), ESQUEMAS.PROMOS, filasPromo);
    promos.hoja.setColumnWidth(6, 30);
  }

  // ZONAS
  var zonas = asegurarHoja_(HOJAS.ZONAS, ESQUEMAS.ZONAS, informe, { llegamos: ['sí', 'no', 'consultar'] });
  if (zonas.creada) {
    agregarFilas_(tabla_(HOJAS.ZONAS), ESQUEMAS.ZONAS, sem.zonas.map(function (z) { return { barrio: z[0], llegamos: z[1] }; }));
  }

  // Pestañas de datos (arrancan vacías)
  asegurarHoja_(HOJAS.CLIENTES, ESQUEMAS.CLIENTES, informe);
  asegurarHoja_(HOJAS.PEDIDOS, ESQUEMAS.PEDIDOS, informe, {
    estado: Logica.LISTA_ESTADOS, vuelta: Logica.LISTA_VUELTAS
  });
  asegurarHoja_(HOJAS.ITEMS, ESQUEMAS.ITEMS, informe);
  asegurarHoja_(HOJAS.GASTOS, ESQUEMAS.GASTOS, informe, { quienPaga: Logica.LISTA_QUIEN_PAGA });
  if (!ss.getSheetByName(HOJAS.CIERRE)) {
    var cierre = ss.insertSheet(HOJAS.CIERRE, ss.getSheets().length);
    cierre.getRange(1, 1).setValue('Acá aparece el detalle del último día que cerraste (menú Avícola → Cerrar el día, o desde la app).');
    informe.push('Creé la pestaña ' + HOJAS.CIERRE + '.');
  }
  asegurarHoja_(HOJAS.HISTORICO, esquemaHistorico_(leerConfig_().porcentajeAgustin), informe);
  asegurarHoja_(HOJAS.AVISOS, ESQUEMAS.AVISOS, informe);

  CACHE_ = {};
  var avisos = actualizarAvisos();
  informe.push(avisos.length ? 'Hay ' + avisos.length + ' aviso(s) en la pestaña AVISOS (precios vacíos, costos faltantes, promos a revisar).' : 'Sin avisos.');
  informe.push('No toqué INICIO, COSTOS, PROMOS ni STOCK.');
  return 'Instalación lista ✓\n\n' + informe.join('\n');
}

/** Crea la pestaña si no existe; si existe, solo le agrega las columnas que le falten. */
function asegurarHoja_(nombre, esquema, informe, listas) {
  var ss = ss_();
  var hoja = ss.getSheetByName(nombre);
  var encabezados = esquema.map(function (c) { return c[1]; });
  if (!hoja) {
    hoja = ss.insertSheet(nombre, ss.getSheets().length);
    var ancho = encabezados.length;
    if (hoja.getMaxColumns() < ancho) hoja.insertColumnsAfter(hoja.getMaxColumns(), ancho - hoja.getMaxColumns());
    hoja.getRange(1, 1, 1, ancho).setValues([encabezados])
      .setFontWeight('bold').setBackground(VERDE_OSCURO).setFontColor('#ffffff');
    hoja.setFrozenRows(1);
    var filas = hoja.getMaxRows() - 1;
    esquema.forEach(function (c, j) {
      var formato = formatoColumna_(c[2]);
      if (formato && filas > 0) hoja.getRange(2, j + 1, filas, 1).setNumberFormat(formato);
      if (listas && listas[c[0]] && filas > 0) {
        var regla = SpreadsheetApp.newDataValidation().requireValueInList(listas[c[0]], true).setAllowInvalid(true).build();
        hoja.getRange(2, j + 1, filas, 1).setDataValidation(regla);
      }
    });
    informe.push('Creé la pestaña ' + nombre + '.');
    return { hoja: hoja, creada: true };
  }
  var t = tabla_(nombre);
  var faltan = esquema.filter(function (c) { return c[1] && t.idx[clave_(c[1])] === undefined; });
  if (faltan.length) {
    var desde = t.enc.length + 1;
    if (hoja.getMaxColumns() < desde + faltan.length - 1) hoja.insertColumnsAfter(hoja.getMaxColumns(), desde + faltan.length - 1 - hoja.getMaxColumns());
    hoja.getRange(1, desde, 1, faltan.length).setValues([faltan.map(function (c) { return c[1]; })])
      .setFontWeight('bold').setBackground(VERDE_OSCURO).setFontColor('#ffffff');
    faltan.forEach(function (c, i) {
      var formato = formatoColumna_(c[2]);
      if (formato && hoja.getMaxRows() > 1) hoja.getRange(2, desde + i, hoja.getMaxRows() - 1, 1).setNumberFormat(formato);
    });
    informe.push('Agregué columnas a ' + nombre + ': ' + faltan.map(function (c) { return c[1]; }).join(', ') + '.');
  }
  return { hoja: hoja, creada: false };
}

// ═════════════════════════════ Lectura y escritura ═════════════════════════════

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function clave_(s) { return Logica.normalizarTexto(s); }

function mensajeError_(err) { return String(err && err.message ? err.message : err); }

function esFechaJs_(v) { return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime()); }

function ahora_() {
  var d = new Date();
  var tz = Logica.ZONA_HORARIA;
  return {
    fecha: Utilities.formatDate(d, tz, 'yyyy-MM-dd'),
    hora: Utilities.formatDate(d, tz, 'HH:mm'),
    sello: Utilities.formatDate(d, tz, 'yyyy-MM-dd HH:mm:ss'),
    anio: Number(Utilities.formatDate(d, tz, 'yyyy'))
  };
}

function escaparHtml_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** JSON seguro para meter dentro de un <script>. */
function jsonParaHtml_(x) {
  return JSON.stringify(x === undefined ? null : x)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function formatoColumna_(tipo) {
  switch (tipo) {
    case 'texto': case 'telefono': return '@';
    case 'fecha': return 'dd/mm/yyyy';
    case 'fechahora': return 'dd/mm/yyyy hh:mm';
    case 'pesos': return '"$"#,##0';
    case 'porcentaje': return '0.0%';
    default: return '';
  }
}

/** Busca en las primeras filas la que tiene los encabezados pedidos (por si hay un título arriba). */
function buscarFilaEncabezado_(valores, requeridos) {
  var req = requeridos.map(clave_);
  for (var r = 0; r < Math.min(valores.length, 15); r++) {
    var claves = valores[r].map(function (v) { return clave_(v); });
    if (req.every(function (k) { return claves.indexOf(k) >= 0; })) return r;
  }
  return 0;
}

/** Lee una pestaña entera de una vez. Los encabezados se buscan por nombre. */
function tabla_(nombre, opciones) {
  var hoja = typeof nombre === 'string' ? ss_().getSheetByName(nombre) : nombre;
  if (!hoja) throw new Error('Falta la pestaña "' + nombre + '". Corré Avícola → Instalar.');
  var ultFila = hoja.getLastRow();
  var ultCol = hoja.getLastColumn();
  var valores = ultFila && ultCol ? hoja.getRange(1, 1, ultFila, ultCol).getValues() : [];
  var filaEnc = opciones && opciones.requeridos ? buscarFilaEncabezado_(valores, opciones.requeridos) : 0;
  var enc = (valores[filaEnc] || []).map(function (h) { return String(h).trim(); });
  var idx = {};
  enc.forEach(function (h, i) {
    var k = clave_(h);
    if (k && idx[k] === undefined) idx[k] = i;
  });
  return {
    hoja: hoja,
    enc: enc,
    idx: idx,
    filaEnc: filaEnc + 1,
    primeraFila: filaEnc + 2,
    filas: valores.slice(filaEnc + 1)
  };
}

function convertirLectura_(v, tipo) {
  var tz = Logica.ZONA_HORARIA;
  if (tipo === 'crudo') return esFechaJs_(v) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : v;
  if (tipo === 'fecha') {
    if (esFechaJs_(v)) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    return Logica.parsearFecha(v, ahora_().anio);
  }
  if (tipo === 'fechahora') return esFechaJs_(v) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd HH:mm:ss') : Logica.texto(v);
  if (tipo === 'pesos') return v === '' || v === null ? null : Logica.parsearPesos(v);
  if (tipo === 'numero') return v === '' || v === null ? null : Logica.parsearMonto(v);
  if (tipo === 'porcentaje') return v === '' || v === null ? null : Logica.parsearPorcentaje(v);
  if (tipo === 'telefono') {
    var car = CACHE_.config ? CACHE_.config.caracteristica : '';
    return Logica.normalizarTelefono(v, car) || Logica.texto(v);
  }
  if (esFechaJs_(v)) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  return Logica.texto(v);
}

/** Filas de la tabla como objetos { campo: valor, _fila: número de fila en la planilla }. */
function objetos_(t, esquema) {
  var salida = [];
  t.filas.forEach(function (fila, i) {
    var o = { _fila: t.primeraFila + i };
    var vacia = true;
    esquema.forEach(function (col) {
      var j = col[1] ? t.idx[clave_(col[1])] : undefined;
      var v = j === undefined ? '' : convertirLectura_(fila[j], col[2]);
      if (v !== '' && v !== null) vacia = false;
      o[col[0]] = v === null ? null : v;
    });
    if (!vacia) salida.push(o);
  });
  return salida;
}

function valorEscritura_(v, tipo) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'sí' : '';
  if (tipo === 'pesos' || tipo === 'numero' || tipo === 'porcentaje') return v === '' || isNaN(Number(v)) ? '' : Number(v);
  return String(v);
}

/** Rango de columnas del esquema (para no pisar columnas que él haya agregado a mano). */
function columnasEsquema_(t, esquema) {
  var cols = [];
  esquema.forEach(function (c) {
    var j = c[1] ? t.idx[clave_(c[1])] : undefined;
    if (j !== undefined) cols.push({ campo: c[0], tipo: c[2], j: j });
  });
  return cols;
}

/** Agrega filas al final. Pone formato texto en teléfonos e IDs para que Sheets no los cambie. */
function agregarFilas_(t, esquema, objetos) {
  if (!objetos || !objetos.length) return 0;
  var hoja = t.hoja;
  var cols = columnasEsquema_(t, esquema);
  if (!cols.length) throw new Error('La pestaña ' + hoja.getName() + ' no tiene los encabezados esperados.');
  var jMin = Math.min.apply(null, cols.map(function (c) { return c.j; }));
  var jMax = Math.max.apply(null, cols.map(function (c) { return c.j; }));
  var desde = Math.max(hoja.getLastRow(), t.filaEnc) + 1;
  var hasta = desde + objetos.length - 1;
  if (hasta > hoja.getMaxRows()) hoja.insertRowsAfter(hoja.getMaxRows(), hasta - hoja.getMaxRows());
  var filas = objetos.map(function (o) {
    var f = [];
    for (var j = jMin; j <= jMax; j++) f.push('');
    cols.forEach(function (c) { f[c.j - jMin] = valorEscritura_(o[c.campo], c.tipo); });
    return f;
  });
  cols.forEach(function (c) {
    var formato = formatoColumna_(c.tipo);
    if (formato) hoja.getRange(desde, c.j + 1, objetos.length, 1).setNumberFormat(formato);
  });
  hoja.getRange(desde, jMin + 1, objetos.length, jMax - jMin + 1).setValues(filas);
  return desde;
}

/** Escribe solo los campos indicados de una fila (los agrupa en tramos seguidos). */
function escribirCampos_(t, numFila, obj, esquema, campos) {
  var cols = columnasEsquema_(t, esquema).filter(function (c) {
    return c.campo.charAt(0) !== '_' && (!campos || campos.indexOf(c.campo) >= 0);
  }).sort(function (a, b) { return a.j - b.j; });
  var i = 0;
  while (i < cols.length) {
    var k = i;
    while (k + 1 < cols.length && cols[k + 1].j === cols[k].j + 1) k++;
    var tramo = cols.slice(i, k + 1);
    t.hoja.getRange(numFila, tramo[0].j + 1, 1, tramo.length)
      .setValues([tramo.map(function (c) { return valorEscritura_(obj[c.campo], c.tipo); })]);
    i = k + 1;
  }
}

/** Borra filas (de abajo hacia arriba, agrupando las seguidas). */
function borrarFilas_(hoja, numeros) {
  var orden = numeros.slice().sort(function (a, b) { return b - a; });
  var i = 0;
  while (i < orden.length) {
    var k = i;
    while (k + 1 < orden.length && orden[k + 1] === orden[k] - 1) k++;
    hoja.deleteRows(orden[k], k - i + 1);
    i = k + 1;
  }
}

function conLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

function leerConfig_() {
  if (CACHE_.config) return CACHE_.config;
  var hoja = ss_().getSheetByName(HOJAS.CONFIG);
  if (!hoja) throw new Error('Falta la pestaña CONFIG. Corré Avícola → Instalar.');
  var t = tabla_(hoja);
  var iClave = t.idx[clave_('Clave')];
  var iValor = t.idx[clave_('Valor')];
  if (iClave === undefined || iValor === undefined) throw new Error('CONFIG tiene que tener las columnas "Clave" y "Valor".');
  // Valores tal como se ven (así "70%" u "11:30" no se convierten en otra cosa).
  var vistos = t.filas.length ? hoja.getRange(t.primeraFila, 1, t.filas.length, t.enc.length).getDisplayValues() : [];
  var pares = vistos.map(function (f) { return [f[iClave], f[iValor]]; });
  CACHE_.config = Logica.interpretarConfig(pares, ahora_().anio);
  return CACHE_.config;
}

function leerCostos_() {
  var hoja = ss_().getSheetByName(HOJAS.COSTOS);
  if (!hoja) return { filas: [], error: 'No encontré la pestaña COSTOS: los costos van a figurar como faltantes.' };
  var t = tabla_(hoja, { requeridos: ['Código', 'Costo unitario base'] });
  var faltan = ESQUEMAS.COSTOS.filter(function (c) { return t.idx[clave_(c[1])] === undefined; }).map(function (c) { return '"' + c[1] + '"'; });
  var filas = objetos_(t, ESQUEMAS.COSTOS).filter(function (c) { return c.codigo; });
  return { filas: filas, error: faltan.length ? 'En COSTOS no encontré la(s) columna(s) ' + faltan.join(', ') + '.' : '' };
}

function leerCatalogo_() {
  if (CACHE_.catalogo) return CACHE_.catalogo;
  var filasPromos = objetos_(tabla_(HOJAS.PROMOS), ESQUEMAS.PROMOS);
  CACHE_.catalogo = Logica.armarCatalogo({
    costos: leerCostos_().filas,
    precios: objetos_(tabla_(HOJAS.PRECIOS), ESQUEMAS.PRECIOS),
    promos: filasPromos.filter(function (f) { return f.codigo; }),
    composicion: filasPromos.filter(function (f) { return f.compPromo; }).map(function (f) {
      return { promo: f.compPromo, codigo: f.compCodigo, cantidad: f.compCantidad };
    })
  });
  return CACHE_.catalogo;
}

function leerZonas_() {
  return objetos_(tabla_(HOJAS.ZONAS), ESQUEMAS.ZONAS).filter(function (z) { return z.barrio; })
    .map(function (z) { return { barrio: z.barrio, llegamos: z.llegamos, notas: z.notas }; });
}

function leerPedidos_() {
  var t = tabla_(HOJAS.PEDIDOS);
  var lista = objetos_(t, ESQUEMAS.PEDIDOS).filter(function (p) { return p.id; }).map(function (p) {
    p.estado = Logica.normalizarEstado(p.estado);
    p.vuelta = Logica.normalizarVuelta(p.vuelta);
    p.costoIncompleto = Logica.esSi(p.costoIncompleto);
    if (p.orden === null) p.orden = '';
    return p;
  });
  return { t: t, lista: lista };
}

function leerLineas_() {
  var t = tabla_(HOJAS.ITEMS);
  var porPedido = {};
  objetos_(t, ESQUEMAS.ITEMS).forEach(function (l) {
    if (!l.pedido) return;
    (porPedido[l.pedido] = porPedido[l.pedido] || []).push({
      codigo: l.codigo, cantidad: l.cantidad || 0, precioUnitario: l.precioUnitario,
      costoUnitario: l.costoUnitario || 0, descripcion: l.descripcion, _fila: l._fila
    });
  });
  return { t: t, porPedido: porPedido };
}

function leerGastos_() {
  return objetos_(tabla_(HOJAS.GASTOS), ESQUEMAS.GASTOS).filter(function (g) { return g.id || g.monto; });
}

/** El pedido como lo usa la web app (sin datos internos de la planilla). */
function pedidoParaApp_(p, lineas) {
  var o = {};
  ESQUEMAS.PEDIDOS.forEach(function (c) {
    var v = p[c[0]];
    if (c[2] === 'pesos') v = Number(v) || 0;
    o[c[0]] = v === null || v === undefined ? '' : v;
  });
  o.costoIncompleto = p.costoIncompleto === true || Logica.esSi(p.costoIncompleto);
  o.lineas = (lineas || []).map(function (l) {
    return {
      codigo: l.codigo, cantidad: Number(l.cantidad) || 0,
      precioUnitario: l.precioUnitario === null || l.precioUnitario === undefined || l.precioUnitario === '' ? null : Number(l.precioUnitario),
      costoUnitario: Number(l.costoUnitario) || 0, descripcion: l.descripcion || ''
    };
  });
  return o;
}

var PREFIJO_HOJA_ = 'hojaImpresa:';

function hojasImpresas_() {
  var props = PropertiesService.getDocumentProperties().getProperties();
  return Object.keys(props).filter(function (k) { return k.indexOf(PREFIJO_HOJA_) === 0; })
    .map(function (k) { return k.slice(PREFIJO_HOJA_.length); }).sort();
}

function marcarHojaImpresa_(fecha) {
  var props = PropertiesService.getDocumentProperties();
  props.setProperty(PREFIJO_HOJA_ + fecha, ahora_().sello);
  var limite = Logica.sumarDias(ahora_().fecha, -30);
  hojasImpresas_().forEach(function (f) { if (f < limite) props.deleteProperty(PREFIJO_HOJA_ + f); });
}

// ═════════════════════════════ Web app ═════════════════════════════

function doGet() {
  var t = HtmlService.createTemplateFromFile('App');
  var datos = null;
  var error = '';
  try {
    datos = obtenerDatos_();
  } catch (err) {
    error = mensajeError_(err);
  }
  t.fuenteLogica = crearLogica_.toString();
  t.datosJson = jsonParaHtml_(datos);
  t.errorJson = jsonParaHtml_(error);
  var titulo = datos && datos.config.nombreNegocio ? datos.config.nombreNegocio : 'Reparto';
  return t.evaluate()
    .setTitle(titulo)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('mobile-web-app-capable', 'yes');
}

/** Todo lo que la app necesita, en una sola lectura. */
function obtenerDatos() {
  return obtenerDatos_();
}

function obtenerDatos_() {
  CACHE_ = {};
  var cfg = leerConfig_();
  var ahora = ahora_();
  var catalogo = leerCatalogo_();
  var desde = Logica.sumarDias(ahora.fecha, -7);
  var clientes = objetos_(tabla_(HOJAS.CLIENTES), ESQUEMAS.CLIENTES).filter(function (c) { return c.telefono; })
    .map(function (c) {
      return {
        telefono: c.telefono, nombre: c.nombre, direccion: c.direccion, entreCalles: c.entreCalles,
        barrio: c.barrio, referencia: c.referencia, ultimaCompra: c.ultimaCompra,
        cantidadCompras: Number(c.cantidadCompras) || 0, notas: c.notas
      };
    });
  var pedidos = leerPedidos_().lista;
  var lineas = leerLineas_().porPedido;
  var ultimos = {};
  pedidos.forEach(function (p) {
    if (!p.telefono || !lineas[p.id] || p.estado === Logica.ESTADOS.CANCELADO) return;
    var orden = (p.fechaEntrega || '') + '|' + (p.fechaCarga || '');
    if (!ultimos[p.telefono] || orden > ultimos[p.telefono].orden) {
      ultimos[p.telefono] = { orden: orden, fecha: p.fechaEntrega, detalle: p.detalle, lineas: pedidoParaApp_(p, lineas[p.id]).lineas };
    }
  });
  Object.keys(ultimos).forEach(function (k) { delete ultimos[k].orden; });
  var historico = objetos_(tabla_(HOJAS.HISTORICO), ESQUEMAS.HISTORICO);
  return {
    hoy: ahora.fecha,
    hora: ahora.hora,
    config: cfg,
    catalogo: { items: catalogo.items, costosBase: catalogo.costosBase },
    zonas: leerZonas_(),
    clientes: clientes,
    pedidos: pedidos.filter(function (p) { return !Logica.esEstadoFinal(p.estado) || p.fechaEntrega >= desde; })
      .map(function (p) { return pedidoParaApp_(p, lineas[p.id]); }),
    ultimos: ultimos,
    gastos: leerGastos_().filter(function (g) { return g.fecha >= desde; }).map(function (g) {
      return { id: g.id, fecha: g.fecha, descripcion: g.descripcion, monto: g.monto || 0, quienPaga: Logica.normalizarQuienPaga(g.quienPaga) };
    }),
    cierres: historico.filter(function (h) { return h.fecha >= desde; }).map(function (h) { return { fecha: h.fecha, cerrado: h.cerrado }; }),
    hojasImpresas: hojasImpresas_()
  };
}

function contexto_(pedidos) {
  return {
    catalogo: leerCatalogo_(),
    config: leerConfig_(),
    ahora: ahora_().sello,
    hojasImpresas: hojasImpresas_(),
    ordenes: Logica.ordenesPorFecha(pedidos)
  };
}

/** Alta o modificación de un pedido (NUEVO PEDIDO, editar y VENTA EN RUTA). */
function guardarPedido(datos) {
  return conLock_(function () {
    CACHE_ = {};
    var ped = leerPedidos_();
    var existente = ped.lista.filter(function (p) { return p.id === datos.id; })[0] || null;
    var r = Logica.prepararPedido(datos, existente, contexto_(ped.lista));
    if (existente) escribirCampos_(ped.t, existente._fila, r.pedido, ESQUEMAS.PEDIDOS);
    else agregarFilas_(ped.t, ESQUEMAS.PEDIDOS, [r.pedido]);
    reemplazarLineas_(r.pedido.id, r.lineas);
    if (Logica.telefonoValido(r.pedido.telefono)) {
      guardarCliente_({
        telefono: r.pedido.telefono, nombre: r.pedido.cliente, direccion: r.pedido.direccion,
        entreCalles: r.pedido.entreCalles, barrio: r.pedido.barrio, referencia: r.pedido.referencia,
        origen: r.pedido.origen
      }, datos.guardarDireccion !== false);
      recalcularClientes_([r.pedido.telefono]);
    }
    return { pedido: pedidoParaApp_(r.pedido, r.lineas), avisos: r.avisos };
  });
}

function reemplazarLineas_(idPedido, lineas) {
  var t = tabla_(HOJAS.ITEMS);
  var col = t.idx[clave_('ID pedido')];
  var filas = [];
  t.filas.forEach(function (f, i) { if (String(f[col]).trim() === idPedido) filas.push(t.primeraFila + i); });
  if (filas.length && filas.length === lineas.length) {
    filas.forEach(function (n, i) { escribirCampos_(t, n, lineas[i], ESQUEMAS.ITEMS); });
    return;
  }
  if (filas.length) borrarFilas_(t.hoja, filas);
  agregarFilas_(t, ESQUEMAS.ITEMS, lineas);
}

function guardarCliente_(datos, actualizarDireccion) {
  var t = tabla_(HOJAS.CLIENTES);
  var existente = objetos_(t, ESQUEMAS.CLIENTES).filter(function (c) { return c.telefono === datos.telefono; })[0];
  if (!existente) {
    agregarFilas_(t, ESQUEMAS.CLIENTES, [{
      telefono: datos.telefono,
      nombre: Logica.normalizarTexto(datos.nombre) === 'sin nombre' ? '' : datos.nombre,
      direccion: datos.direccion, entreCalles: datos.entreCalles, barrio: datos.barrio, referencia: datos.referencia,
      cantidadCompras: 0, totalGastado: 0, origenPrimera: datos.origen, alta: ahora_().sello
    }]);
    return;
  }
  var cambios = Logica.cambiosCliente(existente, datos, actualizarDireccion);
  if (Object.keys(cambios).length) escribirCampos_(t, existente._fila, cambios, ESQUEMAS.CLIENTES, Object.keys(cambios));
}

/** Recalcula primera/última compra, cantidad y total de CLIENTES (null = todos). */
function recalcularClientes_(telefonos) {
  var grupos = {};
  leerPedidos_().lista.forEach(function (p) {
    if (p.telefono) (grupos[p.telefono] = grupos[p.telefono] || []).push(p);
  });
  var t = tabla_(HOJAS.CLIENTES);
  var clientes = objetos_(t, ESQUEMAS.CLIENTES);
  var campos = ['primeraCompra', 'ultimaCompra', 'cantidadCompras', 'totalGastado', 'origenPrimera'];
  if (telefonos) {
    clientes.forEach(function (c) {
      if (telefonos.indexOf(c.telefono) < 0) return;
      var s = Logica.estadisticasCliente(grupos[c.telefono] || []);
      if (c.origenPrimera) s.origenPrimera = c.origenPrimera;
      var cambiar = campos.filter(function (k) { return String(c[k] === null ? '' : c[k]) !== String(s[k]); });
      if (cambiar.length) escribirCampos_(t, c._fila, s, ESQUEMAS.CLIENTES, cambiar);
    });
    return;
  }
  // Todos: se escriben las columnas enteras de una vez (mucho más rápido).
  if (!t.filas.length) return;
  var porFila = {};
  clientes.forEach(function (c) {
    var s = Logica.estadisticasCliente(grupos[c.telefono] || []);
    if (c.origenPrimera) s.origenPrimera = c.origenPrimera;
    porFila[c._fila] = s;
  });
  campos.forEach(function (campo) {
    var col = ESQUEMAS.CLIENTES.filter(function (c) { return c[0] === campo; })[0];
    var j = t.idx[clave_(col[1])];
    if (j === undefined) return;
    var valores = t.filas.map(function (f, i) {
      var s = porFila[t.primeraFila + i];
      return [s ? valorEscritura_(s[campo], col[2]) : f[j]];
    });
    t.hoja.getRange(t.primeraFila, j + 1, valores.length, 1).setValues(valores);
  });
}

/** Cambios rápidos: entregado, cobrado, no estaba, deshacer, reprogramar, monto, notas. */
function actualizarPedido(id, cambios) {
  return conLock_(function () {
    CACHE_ = {};
    var ped = leerPedidos_();
    var p = ped.lista.filter(function (x) { return x.id === id; })[0];
    if (!p) throw new Error('No encontré el pedido ' + id + ' en PEDIDOS.');
    var r = Logica.aplicarCambiosPedido(p, cambios, contexto_(ped.lista));
    if (r.campos.length) escribirCampos_(ped.t, p._fila, r.pedido, ESQUEMAS.PEDIDOS, r.campos);
    if (Logica.telefonoValido(r.pedido.telefono)) recalcularClientes_([r.pedido.telefono]);
    return { pedido: pedidoParaApp_(r.pedido, leerLineas_().porPedido[id]) };
  });
}

/** Guarda el orden de la ruta que quedó en el celu (ids en orden). */
function guardarOrden(fecha, ids) {
  return conLock_(function () {
    var ped = leerPedidos_();
    var cambiados = 0;
    (ids || []).forEach(function (id, i) {
      var p = ped.lista.filter(function (x) { return x.id === id; })[0];
      if (p && Number(p.orden) !== i + 1) {
        escribirCampos_(ped.t, p._fila, { orden: i + 1 }, ESQUEMAS.PEDIDOS, ['orden']);
        cambiados++;
      }
    });
    return { cambiados: cambiados };
  });
}

// ═════════════════════════════ Ruta (Google Maps de Apps Script) ═════════════════════════════

function geocodificar_(direccion) {
  var cache = CacheService.getScriptCache();
  var k = 'geo:' + Logica.hashTexto(direccion);
  var guardado = cache.get(k);
  if (guardado) return JSON.parse(guardado);
  var r = Maps.newGeocoder().setRegion('ar').setLanguage('es').geocode(direccion);
  var res = null;
  if (r && r.status === 'OK' && r.results && r.results.length) {
    var g = r.results[0].geometry;
    if (g && g.location && g.location_type !== 'APPROXIMATE') {
      res = { lat: g.location.lat, lng: g.location.lng, aproximada: g.location_type === 'GEOMETRIC_CENTER' || !!r.results[0].partial_match };
    }
  }
  cache.put(k, JSON.stringify(res), 21600);
  return res;
}

/**
 * Ordena la ruta del día con Google Maps (saliendo y volviendo al local).
 * vuelta: '1ra', '2da' o 'todas'. Las direcciones que no encuentra van al final con aviso.
 */
function ordenarRuta(fecha, vuelta) {
  CACHE_ = {};
  var cfg = leerConfig_();
  fecha = Logica.parsearFecha(fecha, ahora_().anio) || ahora_().fecha;
  if (!cfg.direccionLocal) throw new Error('Falta la "Dirección del local" en CONFIG.');
  var delDia = leerPedidos_().lista.filter(function (p) { return p.fechaEntrega === fecha; });
  var pendientes = delDia.filter(function (p) {
    return !Logica.esEstadoFinal(p.estado) && Logica.entraEnVuelta(p, vuelta);
  });
  var avisos = [];
  var encontrados = [];
  var noEncontrados = [];
  pendientes.forEach(function (p) {
    if (!Logica.direccionCompleta(p.direccion)) {
      noEncontrados.push(p.id);
      avisos.push('Sin dirección completa: ' + (p.cliente || 'Sin nombre') + ' (va al final).');
      return;
    }
    var g = geocodificar_(Logica.direccionParaMapa(p, cfg));
    if (!g) {
      noEncontrados.push(p.id);
      avisos.push('No encontré en el mapa la dirección de ' + (p.cliente || 'Sin nombre') + ': ' + p.direccion + ' (va al final).');
      return;
    }
    if (g.aproximada) avisos.push('Revisá la dirección de ' + (p.cliente || 'Sin nombre') + ': Google la ubicó aproximada.');
    encontrados.push({ id: p.id, g: g });
  });
  var MAX_PARADAS = 23;
  var ids = encontrados.map(function (x) { return x.id; });
  var optimizados = ids;
  if (encontrados.length >= 2) {
    var tramo = encontrados.slice(0, MAX_PARADAS);
    var df = Maps.newDirectionFinder()
      .setOrigin(cfg.direccionLocal).setDestination(cfg.direccionLocal)
      .setMode(Maps.DirectionFinder.Mode.DRIVING).setOptimizeWaypoints(true)
      .setLanguage('es').setRegion('ar');
    tramo.forEach(function (x) { df.addWaypoint(x.g.lat + ',' + x.g.lng); });
    var r = df.getDirections();
    if (r && r.status === 'OK' && r.routes && r.routes.length) {
      optimizados = Logica.aplicarOrdenOptimizado(tramo.map(function (x) { return x.id; }), r.routes[0].waypoint_order)
        .concat(ids.slice(MAX_PARADAS));
    } else {
      avisos.push('Google Maps no pudo armar la ruta (' + (r && r.status ? r.status : 'sin respuesta') + '). Quedó el orden que había.');
    }
    if (encontrados.length > MAX_PARADAS) avisos.push('Hay más de ' + MAX_PARADAS + ' paradas: las últimas quedaron sin optimizar.');
  }
  var secuencia = Logica.nuevaSecuencia(delDia, optimizados.concat(noEncontrados), vuelta);
  conLock_(function () {
    var ped = leerPedidos_();
    secuencia.forEach(function (s) {
      var p = ped.lista.filter(function (x) { return x.id === s.id; })[0];
      if (p && Number(p.orden) !== s.orden) escribirCampos_(ped.t, p._fila, { orden: s.orden }, ESQUEMAS.PEDIDOS, ['orden']);
    });
  });
  return { orden: secuencia, avisos: avisos, ordenados: pendientes.length };
}

// ═════════════════════════════ Hoja de reparto (PDF) ═════════════════════════════

function carpeta_(nombre) {
  var it = DriveApp.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nombre);
}

/** Genera el PDF A4 de la vuelta elegida ('1ra', '2da' o 'todas') y lo guarda en Drive. */
function generarHoja(fecha, vuelta) {
  CACHE_ = {};
  var cfg = leerConfig_();
  var ahora = ahora_();
  fecha = Logica.parsearFecha(fecha, ahora.anio) || ahora.fecha;
  vuelta = Logica.normalizarVuelta(vuelta) || 'todas';
  var lineas = leerLineas_().porPedido;
  var pedidos = leerPedidos_().lista.filter(function (p) {
    return p.fechaEntrega === fecha && p.estado === Logica.ESTADOS.CONFIRMADO && Logica.entraEnVuelta(p, vuelta);
  }).sort(function (a, b) {
    return (Number(a.orden) || 9999) - (Number(b.orden) || 9999) || String(a.fechaCarga).localeCompare(String(b.fechaCarga));
  }).map(function (p) { return pedidoParaApp_(p, lineas[p.id]); });

  var datos = Logica.datosHojaReparto({
    fecha: fecha, vuelta: vuelta, pedidos: pedidos, catalogo: leerCatalogo_(), config: cfg,
    generado: Logica.formatearFecha(ahora.fecha) + ' ' + ahora.hora
  });
  var plantilla = HtmlService.createTemplateFromFile('Hoja');
  plantilla.d = datos;
  var html = plantilla.evaluate().getContent();
  var nombre = 'Hoja de reparto ' + fecha + ' ' + Logica.nombreVuelta(vuelta);
  var carpeta = carpeta_(cfg.carpetaHojas || 'Hojas de reparto');
  var viejos = carpeta.getFilesByName(nombre + '.pdf');
  while (viejos.hasNext()) viejos.next().setTrashed(true);
  var pdf = Utilities.newBlob(html, 'text/html', nombre + '.html').getAs('application/pdf').setName(nombre + '.pdf');
  var archivo = carpeta.createFile(pdf);
  if (vuelta !== Logica.VUELTAS.SEGUNDA) marcarHojaImpresa_(fecha);
  return { url: archivo.getUrl(), nombre: archivo.getName(), cantidad: pedidos.length, fecha: fecha, vuelta: vuelta };
}

// ═════════════════════════════ Gastos y cierre ═════════════════════════════

function guardarGasto(gasto) {
  return conLock_(function () {
    var t = tabla_(HOJAS.GASTOS);
    var obj = {
      id: Logica.texto(gasto.id),
      fecha: Logica.parsearFecha(gasto.fecha, ahora_().anio) || ahora_().fecha,
      descripcion: Logica.texto(gasto.descripcion),
      monto: Logica.parsearPesos(gasto.monto) || 0,
      quienPaga: Logica.normalizarQuienPaga(gasto.quienPaga)
    };
    if (!obj.id) throw new Error('El gasto no tiene ID.');
    var existente = objetos_(t, ESQUEMAS.GASTOS).filter(function (g) { return g.id === obj.id; })[0];
    if (existente) escribirCampos_(t, existente._fila, obj, ESQUEMAS.GASTOS);
    else agregarFilas_(t, ESQUEMAS.GASTOS, [obj]);
    return { ok: true };
  });
}

function borrarGasto(id) {
  return conLock_(function () {
    var t = tabla_(HOJAS.GASTOS);
    var filas = objetos_(t, ESQUEMAS.GASTOS).filter(function (g) { return g.id === id; }).map(function (g) { return g._fila; });
    if (filas.length) borrarFilas_(t.hoja, filas);
    return { borrados: filas.length };
  });
}

/** Cierra el día: arma el detalle en CIERRE y guarda (o reemplaza) la fila del día en HISTÓRICO. */
function cerrarDia(fecha, retiroReal) {
  return conLock_(function () {
    CACHE_ = {};
    var cfg = leerConfig_();
    var ahora = ahora_();
    fecha = Logica.parsearFecha(fecha, ahora.anio) || ahora.fecha;
    var lineas = leerLineas_().porPedido;
    var pedidos = leerPedidos_().lista.filter(function (p) { return p.fechaEntrega === fecha; })
      .map(function (p) { return pedidoParaApp_(p, lineas[p.id]); });
    var r = Logica.cierreDelDia({
      fecha: fecha,
      pedidos: pedidos,
      gastos: leerGastos_().map(function (g) { return { id: g.id, fecha: g.fecha, descripcion: g.descripcion, monto: g.monto, quienPaga: g.quienPaga }; }),
      retiroReal: retiroReal,
      porcentajeAgustin: cfg.porcentajeAgustin,
      medios: cfg.mediosPago,
      catalogo: leerCatalogo_(),
      ordenCategorias: cfg.ordenCategorias
    });
    r.cerrado = ahora.sello;
    escribirCierre_(r, cfg);
    guardarHistorico_(r);
    recalcularClientes_(null);
    return r;
  });
}

function escribirCierre_(r, cfg) {
  var hoja = ss_().getSheetByName(HOJAS.CIERRE) || ss_().insertSheet(HOJAS.CIERRE, ss_().getSheets().length);
  var P = '"$"#,##0';
  var PCT = '0.0%';
  var filas = [];
  var titulos = [];
  var subtitulos = [];
  function fila(valores, formatos) { filas.push({ v: valores, f: formatos || [] }); return filas.length; }
  function titulo(t) { titulos.push(fila([t])); }
  function encabezado(cols) { subtitulos.push(fila(cols)); }
  function vacia() { fila(['']); }
  var pct = Math.round((r.porcentajeAgustin || 0) * 100);
  var hayCompartidos = r.gastosCompartidos > 0;

  titulos.push(fila(['CIERRE DEL DÍA — ' + Logica.formatearFechaLarga(r.fecha) + ' ' + Logica.formatearFecha(r.fecha).slice(-4)]));
  fila(['Cerrado el ' + r.cerrado]);
  vacia();
  titulo('RESUMEN');
  fila(['Pedidos entregados', r.entregados]);
  fila(['Ventas', r.ventas], ['', P]);
  fila(['Costo de mercadería', r.costo], ['', P]);
  fila(['Ganancia (ventas − costo de mercadería)', r.ganancia], ['', P]);
  fila(['Margen', r.margen === null ? '' : r.margen], ['', PCT]);
  fila(['Agustín ' + pct + '%', r.agustin], ['', P]);
  fila(['Local ' + (100 - pct) + '%', r.local], ['', P]);
  fila(['Gastos que paga el local', r.gastosLocal], ['', P]);
  if (hayCompartidos) {
    fila(['Gastos que se reparten entre los dos', r.gastosCompartidos], ['', P]);
    fila(['   parte de Agustín (' + pct + '%)', r.compartidosAgustin], ['', P]);
    fila(['   parte del local (' + (100 - pct) + '%)', r.compartidosLocal], ['', P]);
  }
  fila(['Le queda al local', r.leQuedaLocal], ['', P]);
  fila([hayCompartidos ? 'Retiro calculado (Agustín ' + pct + '% − su parte de los gastos que se reparten)' : 'Retiro calculado (Agustín ' + pct + '% completo)', r.retiroCalculado], ['', P]);
  fila(['Retiro real', r.retiroReal === null ? '' : r.retiroReal], ['', P]);
  fila(['Diferencia (real − calculado)', r.diferencia === null ? '' : r.diferencia], ['', P]);
  vacia();
  titulo('COBRADO POR MEDIO DE PAGO');
  r.porMedio.forEach(function (m) { fila([m.medio, m.monto], ['', P]); });
  fila(['Pendiente de cobro', r.pendienteCobro], ['', P]);
  vacia();
  titulo('DETALLE POR CLIENTE');
  encabezado(['Cliente', 'Teléfono', 'Pedido', 'Cobrado', 'Medio', 'Costo', 'Ganancia', 'Margen']);
  r.clientes.forEach(function (c) {
    fila([c.cliente, c.telefono, c.detalle, c.cobrado, c.medio || 'Pendiente', c.costo, c.ganancia, c.margen === null ? '' : c.margen],
      ['@', '@', '', P, '', P, P, PCT]);
  });
  fila(['TOTAL', '', '', r.ventas, '', r.costo, r.ganancia, r.margen === null ? '' : r.margen], ['', '', '', P, '', P, P, PCT]);
  vacia();
  titulo('UNIDADES POR CATEGORÍA');
  encabezado(['Categoría', 'Cantidad']);
  r.unidades.forEach(function (u) { fila([u.categoria, u.texto]); });
  if (r.promos.length) {
    vacia();
    encabezado(['Promo', 'Cantidad']);
    r.promos.forEach(function (p) { fila([p.nombre, p.cantidad]); });
  }
  vacia();
  titulo('GASTOS DEL DÍA');
  encabezado(['Descripción', 'Monto', 'Quién lo paga']);
  if (!r.gastos.length) fila(['(sin gastos)']);
  r.gastos.forEach(function (g) { fila([g.descripcion, g.monto, g.quienPaga], ['', P]); });
  if (r.sinEstadoFinal.length || r.noEstaban.length || r.costosFaltantes) {
    vacia();
    titulo('AVISOS');
    if (r.sinEstadoFinal.length) fila(['Quedaron sin marcar: ' + r.sinEstadoFinal.map(function (p) { return p.cliente; }).join(', ')]);
    if (r.noEstaban.length) fila(['No estaban (para reprogramar): ' + r.noEstaban.map(function (p) { return p.cliente; }).join(', ')]);
    if (r.costosFaltantes) fila(['Hay pedidos con costos faltantes: la ganancia real es menor. Mirá la pestaña AVISOS.']);
  }

  var ancho = 8;
  hoja.clear();
  if (hoja.getMaxColumns() < ancho) hoja.insertColumnsAfter(hoja.getMaxColumns(), ancho - hoja.getMaxColumns());
  if (hoja.getMaxRows() < filas.length) hoja.insertRowsAfter(hoja.getMaxRows(), filas.length - hoja.getMaxRows());
  var valores = filas.map(function (f) { var v = f.v.slice(); while (v.length < ancho) v.push(''); return v; });
  var formatos = filas.map(function (f) {
    var x = [];
    for (var i = 0; i < ancho; i++) x.push(f.f[i] || (typeof f.v[i] === 'string' ? '@' : '0'));
    return x;
  });
  var rango = hoja.getRange(1, 1, filas.length, ancho);
  rango.setNumberFormats(formatos);
  rango.setValues(valores);
  titulos.forEach(function (n) { hoja.getRange(n, 1, 1, ancho).setFontWeight('bold').setBackground(VERDE_OSCURO).setFontColor('#ffffff'); });
  subtitulos.forEach(function (n) { hoja.getRange(n, 1, 1, ancho).setFontWeight('bold').setBackground('#e8f5e9'); });
  hoja.setColumnWidth(1, 260).setColumnWidth(3, 320);
}

/** Columnas de HISTÓRICO. Las de Agustín y el local llevan el porcentaje de CONFIG ("Local 30%"). */
function esquemaHistorico_(porcentajeAgustin) {
  var pct = Math.round((Number(porcentajeAgustin) || 0) * 100);
  return ESQUEMAS.HISTORICO.map(function (c) {
    if (c[0] === 'agustin') return [c[0], 'Agustín ' + pct + '%', c[2]];
    if (c[0] === 'local') return [c[0], 'Local ' + (100 - pct) + '%', c[2]];
    return c;
  });
}

function guardarHistorico_(r) {
  var hoja = ss_().getSheetByName(HOJAS.HISTORICO);
  var t = tabla_(HOJAS.HISTORICO);
  // Una columna "Cobrado <medio>" por cada medio de pago (se agregan solas si sumás uno en CONFIG).
  // Si cambia el porcentaje en CONFIG, aparecen columnas nuevas ("Local 35%") y lo viejo queda como estaba.
  var esquema = esquemaHistorico_(r.porcentajeAgustin);
  r.porMedio.forEach(function (m, i) { esquema.push(['medio' + i, 'Cobrado ' + m.medio, 'pesos']); });
  var nuevas = esquema.filter(function (c) { return t.idx[clave_(c[1])] === undefined; }).map(function (c) { return c[1]; });
  if (nuevas.length) {
    var desde = t.enc.length + 1;
    if (hoja.getMaxColumns() < desde + nuevas.length - 1) hoja.insertColumnsAfter(hoja.getMaxColumns(), desde + nuevas.length - 1 - hoja.getMaxColumns());
    hoja.getRange(1, desde, 1, nuevas.length).setValues([nuevas]).setFontWeight('bold').setBackground(VERDE_OSCURO).setFontColor('#ffffff');
    t = tabla_(HOJAS.HISTORICO);
  }
  var obj = {
    fecha: r.fecha, entregados: r.entregados, noEstaban: r.noEstaban.length, ventas: r.ventas, costo: r.costo,
    ganancia: r.ganancia, margen: r.margen === null ? '' : r.margen, agustin: r.agustin, local: r.local,
    gastosLocal: r.gastosLocal, gastosCompartidos: r.gastosCompartidos, leQuedaLocal: r.leQuedaLocal,
    retiroCalculado: r.retiroCalculado, retiroReal: r.retiroReal === null ? '' : r.retiroReal,
    diferencia: r.diferencia === null ? '' : r.diferencia, pendienteCobro: r.pendienteCobro,
    costosFaltantes: r.costosFaltantes ? 'sí' : '',
    detalleGastos: r.gastos.map(function (g) {
      return g.descripcion + ' ' + Logica.formatearPesos(g.monto) + (g.quienPaga === Logica.QUIEN_PAGA.COMPARTIDO ? ' (se reparte)' : ' (local)');
    }).join(' · '),
    cerrado: r.cerrado
  };
  r.porMedio.forEach(function (m, i) { obj['medio' + i] = m.monto; });
  var existente = objetos_(t, ESQUEMAS.HISTORICO).filter(function (h) { return h.fecha === r.fecha; })[0];
  if (existente) escribirCampos_(t, existente._fila, obj, esquema);
  else agregarFilas_(t, esquema, [obj]);
}

// ═════════════════════════════ Avisos ═════════════════════════════

/** Recalcula la pestaña AVISOS (márgenes bajos, costos faltantes, precios vacíos). */
function actualizarAvisos() {
  CACHE_ = {};
  var cfg = leerConfig_();
  var avisos = Logica.calcularAvisos(leerCatalogo_(), cfg.margenMinimo);
  var costos = leerCostos_();
  if (costos.error) avisos.unshift({ tipo: 'COSTOS', codigo: '', nombre: '', detalle: costos.error });
  cfg.faltantes.forEach(function (f) { avisos.unshift({ tipo: 'Falta en CONFIG', codigo: '', nombre: f, detalle: 'Completalo en la pestaña CONFIG.' }); });
  cfg.avisos.forEach(function (a) { avisos.unshift({ tipo: 'CONFIG', codigo: '', nombre: '', detalle: a }); });
  var t = tabla_(HOJAS.AVISOS);
  if (t.filas.length) t.hoja.getRange(t.primeraFila, 1, t.filas.length, Math.max(t.enc.length, 1)).clearContent();
  var sello = ahora_().sello;
  agregarFilas_(tabla_(HOJAS.AVISOS), ESQUEMAS.AVISOS, avisos.map(function (a) {
    return { tipo: a.tipo, codigo: a.codigo, nombre: a.nombre, detalle: a.detalle, actualizado: sello };
  }));
  return avisos;
}

// ═════════════════════════════ Importaciones (se corren una vez) ═════════════════════════════

function abrirPlanillaDeConfig_(valor, nombreClave) {
  var id = Logica.extraerIdPlanilla(valor);
  if (!id) throw new Error('Completá "' + nombreClave + '" en CONFIG con el ID o el link de la planilla.');
  return SpreadsheetApp.openById(id);
}

/** Importa contactos (columnas Given Name, Phone 1 - Value, Address 1 - Formatted, Notes). */
function importarClientes() {
  var r = importarClientes_();
  console.log(r);
  return r;
}

function importarClientes_() {
  CACHE_ = {};
  var cfg = leerConfig_();
  var origen = abrirPlanillaDeConfig_(cfg.idClientesImportar, Logica.CLAVES_CONFIG.idClientesImportar);
  var hoja = null;
  var t = null;
  origen.getSheets().some(function (h) {
    var x = tabla_(h, { requeridos: ['Phone 1 - Value'] });
    if (x.idx[clave_('Phone 1 - Value')] !== undefined) { hoja = h; t = x; return true; }
    return false;
  });
  if (!hoja) throw new Error('No encontré la columna "Phone 1 - Value" en la planilla de clientes.');
  var col = function (fila, nombres) {
    for (var i = 0; i < nombres.length; i++) {
      var j = t.idx[clave_(nombres[i])];
      if (j !== undefined && Logica.texto(fila[j])) return Logica.texto(fila[j]);
    }
    return '';
  };
  var filas = t.filas.map(function (f) {
    return {
      nombre: col(f, ['Given Name', 'First Name', 'Name']),
      telefono: col(f, ['Phone 1 - Value']),
      direccion: col(f, ['Address 1 - Formatted']),
      notas: col(f, ['Notes'])
    };
  });
  var tc = tabla_(HOJAS.CLIENTES);
  var existentes = objetos_(tc, ESQUEMAS.CLIENTES);
  var res = Logica.prepararImportacionClientes(filas, existentes, leerZonas_(), cfg.caracteristica);
  var sello = ahora_().sello;
  conLock_(function () {
    agregarFilas_(tc, ESQUEMAS.CLIENTES, res.nuevos.map(function (c) {
      return { telefono: c.telefono, nombre: c.nombre, direccion: c.direccion, barrio: c.barrio, notas: c.notas,
        cantidadCompras: 0, totalGastado: 0, alta: sello };
    }));
    var porTel = {};
    existentes.forEach(function (c) { porTel[c.telefono] = c; });
    res.actualizar.forEach(function (a) {
      escribirCampos_(tc, porTel[a.telefono]._fila, a.cambios, ESQUEMAS.CLIENTES, Object.keys(a.cambios));
    });
    recalcularClientes_(null);
  });
  return 'Clientes importados ✓\n\nNuevos: ' + res.nuevos.length +
    '\nYa estaban (completé datos vacíos en ' + res.actualizar.length + '): ' + res.repetidos +
    '\nSin teléfono válido (no se importaron): ' + res.sinTelefono;
}

/** Importa la pestaña "Ventas" vieja como pedidos entregados. Si se corre dos veces no duplica. */
function importarVentasOctubre() {
  var r = importarVentasOctubre_();
  console.log(r);
  return r;
}

function importarVentasOctubre_() {
  CACHE_ = {};
  var cfg = leerConfig_();
  var ahora = ahora_();
  var origen = abrirPlanillaDeConfig_(cfg.idVentasImportar, Logica.CLAVES_CONFIG.idVentasImportar);
  var hoja = origen.getSheets().filter(function (h) { return clave_(h.getName()) === 'ventas'; })[0];
  if (!hoja) throw new Error('No encontré la pestaña "Ventas" en esa planilla.');
  var t = tabla_(hoja, { requeridos: ['Fecha', 'Cliente'] });
  var esquemaVentas = [
    ['fecha', 'Fecha', 'fecha'], ['cliente', 'Cliente', 'texto'], ['zona', 'Zona', 'texto'],
    ['producto', 'Producto/promo', 'texto'], ['detalle', 'Detalle', 'texto'], ['precio', 'Precio cobrado', 'crudo'],
    ['costo', 'Costo', 'crudo'], ['ganancia', 'Ganancia', 'crudo'], ['medio', 'Medio de pago', 'texto'], ['nota', 'Nota', 'texto']
  ];
  var filas = objetos_(t, esquemaVentas);
  var catalogo = leerCatalogo_();
  var clientesPorNombre = {};
  objetos_(tabla_(HOJAS.CLIENTES), ESQUEMAS.CLIENTES).forEach(function (c) {
    var k = Logica.normalizarTexto(c.nombre);
    if (k && c.telefono) (clientesPorNombre[k] = clientesPorNombre[k] || []).push(c.telefono);
  });
  var ped = leerPedidos_();
  var idsExistentes = {};
  ped.lista.forEach(function (p) { idsExistentes[p.id] = true; });
  var ocurrencias = {};
  var pedidos = [];
  var lineas = [];
  var sinFecha = 0;
  var yaEstaban = 0;
  filas.forEach(function (f) {
    if (!f.fecha) { sinFecha++; return; }
    var campos = [f.fecha, f.cliente, f.producto, f.detalle, f.precio, f.medio, f.nota];
    var base = campos.map(Logica.normalizarTexto).join('|');
    ocurrencias[base] = (ocurrencias[base] || 0) + 1;
    var id = Logica.idImportacion(campos, ocurrencias[base]);
    if (idsExistentes[id]) { yaEstaban++; return; }
    var r = Logica.interpretarVentaImportada(f, {
      id: id, catalogo: catalogo, medios: cfg.mediosPago, clientesPorNombre: clientesPorNombre,
      caracteristica: cfg.caracteristica, ahora: ahora.sello
    });
    pedidos.push(r.pedido);
    lineas = lineas.concat(r.lineas);
  });
  var sinTelefono = pedidos.filter(function (p) { return !p.telefono; }).length;
  conLock_(function () {
    agregarFilas_(tabla_(HOJAS.PEDIDOS), ESQUEMAS.PEDIDOS, pedidos);
    agregarFilas_(tabla_(HOJAS.ITEMS), ESQUEMAS.ITEMS, lineas);
    // Clientes con teléfono que todavía no estaban en CLIENTES.
    var tc = tabla_(HOJAS.CLIENTES);
    var conocidos = {};
    objetos_(tc, ESQUEMAS.CLIENTES).forEach(function (c) { conocidos[c.telefono] = true; });
    var nuevos = [];
    pedidos.forEach(function (p) {
      if (p.telefono && !conocidos[p.telefono]) {
        conocidos[p.telefono] = true;
        nuevos.push({ telefono: p.telefono, nombre: p.cliente === 'Sin nombre' ? '' : p.cliente, barrio: p.barrio,
          cantidadCompras: 0, totalGastado: 0, alta: ahora.sello });
      }
    });
    agregarFilas_(tc, ESQUEMAS.CLIENTES, nuevos);
    recalcularClientes_(null);
  });
  return 'Ventas importadas ✓\n\nNuevas: ' + pedidos.length +
    ' (sin teléfono: ' + sinTelefono + ')\nYa estaban importadas: ' + yaEstaban +
    '\nFilas sin fecha válida (no se importaron): ' + sinFecha;
}
