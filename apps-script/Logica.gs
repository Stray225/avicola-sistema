/**
 * Logica.gs — Llegamos! / Avícola Belgrano
 *
 * Acá van SOLO funciones puras: reciben datos y devuelven resultados.
 * No leen la planilla ni usan Drive o Maps. Por eso:
 *   - se prueban en la compu con Node (carpeta tests/), y
 *   - la web app recibe este mismo código, así el celu calcula igual que la planilla.
 *
 * Reglas de la casa:
 *   - Plata: siempre pesos enteros.
 *   - Fechas: texto "aaaa-mm-dd" en hora de Buenos Aires.
 *   - Teléfonos: texto "+549" + 10 dígitos (ej. +5491100000000).
 *   - Nada de precios, costos, zonas ni textos de mensajes acá: todo llega desde la planilla.
 */
function crearLogica_() {
  'use strict';

  var ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

  var ESTADOS = { CONFIRMADO: 'confirmado', ENTREGADO: 'entregado', NO_ESTABA: 'no estaba', CANCELADO: 'cancelado' };
  var LISTA_ESTADOS = [ESTADOS.CONFIRMADO, ESTADOS.ENTREGADO, ESTADOS.NO_ESTABA, ESTADOS.CANCELADO];
  var VUELTAS = { PRIMERA: '1ra', SEGUNDA: '2da', EN_RUTA: 'en ruta' };
  var LISTA_VUELTAS = [VUELTAS.PRIMERA, VUELTAS.SEGUNDA, VUELTAS.EN_RUTA];

  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // Nombres de las filas de la pestaña CONFIG (la columna "Clave").
  var CLAVES_CONFIG = {
    nombreNegocio: 'Nombre del negocio',
    direccionLocal: 'Dirección del local',
    porcentajeAgustin: 'Porcentaje Agustín',
    porcentajeLocal: 'Porcentaje local',
    margenMinimo: 'Margen mínimo de alerta',
    mediosPago: 'Medios de pago',
    origenes: 'Orígenes',
    origenEnRuta: 'Origen de las ventas en ruta',
    horaCorte: 'Hora de corte para entrega en el día',
    diasSinReparto: 'Días sin reparto (feriados)',
    umbralMayorista: 'Maples desde los que es mayorista',
    envioPorDefecto: 'Envío por defecto',
    caracteristica: 'Característica para teléfonos sin código de área',
    localidadPorDefecto: 'Localidad si no hay barrio',
    sufijoDirecciones: 'Agregar al final de cada dirección',
    paradasPorLink: 'Paradas por link de Google Maps',
    ordenCategorias: 'Orden de categorías en la carga',
    carpetaHojas: 'Carpeta de Drive para las hojas',
    whatsappBusiness: 'Abrir WhatsApp Business en Android',
    mensajeAvisoVoy: 'Mensaje: aviso que voy',
    mensajeNoEstaba: 'Mensaje: no estaba',
    mensajeConfirmacion: 'Mensaje: pedido confirmado',
    idClientesImportar: 'ID planilla de clientes a importar',
    idVentasImportar: 'ID planilla de ventas a importar'
  };
  // Si falta alguna de estas, la app lo avisa arriba.
  var CONFIG_OBLIGATORIA = ['direccionLocal', 'porcentajeAgustin', 'margenMinimo', 'mediosPago',
    'horaCorte', 'umbralMayorista', 'mensajeAvisoVoy', 'mensajeNoEstaba'];

  // ───────────────────────────── Texto ─────────────────────────────

  function texto(v) {
    return v === null || v === undefined ? '' : String(v).trim();
  }

  /** Minúsculas, sin acentos y sin espacios de más. Sirve para comparar y buscar. */
  function normalizarTexto(v) {
    return texto(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ').trim();
  }

  /** Código de producto o promo en mayúsculas ("h-b1 " → "H-B1"). */
  function normalizarCodigo(v) {
    return texto(v).toUpperCase().replace(/\s+/g, ' ');
  }

  /** Clave tolerante para comparar códigos o nombres ("PROMO FULL" y "promo-full" → "promofull"). */
  function claveCodigo(v) {
    return normalizarTexto(v).replace(/[^a-z0-9]/g, '');
  }

  function esSi(v) {
    if (v === true || v === 1) return true;
    var t = normalizarTexto(v);
    return ['si', 's', 'x', 'true', 'verdadero', 'yes', '1', '✓', '✔'].indexOf(t) >= 0;
  }

  /** "a, b; c" → ["a", "b", "c"] */
  function parsearLista(v) {
    return texto(v).split(/[,;\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function acortar(v, max) {
    var t = texto(v).replace(/\s+/g, ' ');
    return t.length > max ? t.slice(0, Math.max(1, max - 1)).trim() + '…' : t;
  }

  // ───────────────────────────── Números y plata ─────────────────────────────

  /** Redondea a entero (sin errores de coma flotante tipo 1374,9999). */
  function redondear(n) {
    if (typeof n !== 'number' || !isFinite(n)) return 0;
    var r = Math.round(Math.abs(Number(n.toFixed(6))));
    return n < 0 && r ? -r : r;
  }

  function multiplicarPesos(pesos, cantidad) {
    return redondear((Number(pesos) || 0) * (Number(cantidad) || 0));
  }

  // "29.900" / "5.000,00" / "0,5" / "1,234,567" → número. Sin signo ni espacios.
  function numeroDesdeTexto_(s) {
    if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
    var ultimoPunto = s.lastIndexOf('.');
    var ultimaComa = s.lastIndexOf(',');
    var entero;
    var decimal = '';
    if (ultimoPunto >= 0 && ultimaComa >= 0) {
      var sepDecimal = ultimoPunto > ultimaComa ? '.' : ',';
      var sepMiles = sepDecimal === '.' ? ',' : '.';
      var partes = s.split(sepDecimal);
      if (partes.length !== 2 || partes[1].indexOf(sepMiles) >= 0) return null;
      entero = partes[0].split(sepMiles).join('');
      decimal = partes[1];
    } else if (ultimaComa >= 0) {
      var p = s.split(',');
      if (p.length > 2) {
        if (!p.slice(1).every(function (x) { return x.length === 3; })) return null;
        entero = p.join('');
      } else {
        entero = p[0]; // formato argentino: la coma es decimal
        decimal = p[1];
      }
    } else if (ultimoPunto >= 0) {
      var q = s.split('.');
      var pareceMiles = q.length > 2 || (q[1].length === 3 && q[0] !== '0' && q[0] !== '');
      if (pareceMiles) {
        if (!q.slice(1).every(function (x) { return x.length === 3; })) return null;
        entero = q.join('');
      } else {
        entero = q[0];
        decimal = q[1];
      }
    } else {
      entero = s;
    }
    var n = Number((entero || '0') + (decimal ? '.' + decimal : ''));
    return isNaN(n) ? null : n;
  }

  /**
   * Lee un monto escrito a mano o dictado: 5000, "$5.000,00", "29.900", "30 mil", "30 lucas",
   * "-$1.500", "(1.500)". Devuelve número (puede tener decimales) o null si no se entiende.
   */
  function parsearMonto(valor) {
    if (valor === null || valor === undefined || valor === '' || typeof valor === 'boolean') return null;
    if (typeof valor === 'number') return isFinite(valor) ? valor : null;
    var s = normalizarTexto(valor);
    if (!s) return null;
    var negativo = false;
    if (/^\(.*\)$/.test(s)) { negativo = true; s = s.slice(1, -1); }
    s = s.replace(/\$|\bars\b|\bpesos?\b/g, ' ').trim();
    if (s.charAt(0) === '-') { negativo = !negativo; s = s.slice(1).trim(); }
    var resultado;
    var mil = /^([\d.,]+)\s*(?:mil|lucas?|k)\s*([\d.,]*)$/.exec(s);
    if (mil) {
      var a = numeroDesdeTexto_(mil[1]);
      var b = mil[2] ? numeroDesdeTexto_(mil[2]) : 0;
      if (a === null || b === null) return null;
      resultado = a * 1000 + b;
    } else {
      resultado = numeroDesdeTexto_(s.replace(/\s+/g, ''));
    }
    if (resultado === null) return null;
    return negativo ? -resultado : resultado;
  }

  /** Igual que parsearMonto pero redondeado a pesos enteros. */
  function parsearPesos(valor) {
    var n = parsearMonto(valor);
    return n === null ? null : redondear(n);
  }

  /** Cantidades: "0,5" → 0.5. No acepta negativos. */
  function parsearCantidad(valor) {
    var n = parsearMonto(valor);
    return n === null || n < 0 ? null : Number(n.toFixed(3));
  }

  /** "70%" / 0.7 / "70" / "0,7" → 0.7 */
  function parsearPorcentaje(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    var conSigno = typeof valor === 'string' && valor.indexOf('%') >= 0;
    var n = parsearMonto(typeof valor === 'string' ? valor.replace(/%/g, '') : valor);
    if (n === null) return null;
    if (conSigno || n > 1) n = n / 100;
    return Number(n.toFixed(6));
  }

  /** 30000 → "$ 30.000" */
  function formatearPesos(n) {
    if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '';
    var v = redondear(Number(n));
    var s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (v < 0 ? '-' : '') + '$ ' + s;
  }

  /** 0.5 → "0,5"; 2 → "2" */
  function formatearCantidad(n) {
    var v = Number(n);
    if (!isFinite(v)) return '';
    return String(Number(v.toFixed(3))).replace('.', ',');
  }

  /** 0.4123 → "41,2%" */
  function formatearPorcentaje(f) {
    if (f === null || f === undefined || !isFinite(f)) return '—';
    return String(Math.round(f * 1000) / 10).replace('.', ',') + '%';
  }

  /** Margen sobre el precio de venta: (precio − costo) / precio. */
  function margen(precio, costo) {
    var p = Number(precio) || 0;
    if (p <= 0) return null;
    return Number(((p - (Number(costo) || 0)) / p).toFixed(6));
  }

  /** Reparte un monto entre Agustín y el local sin perder ni un peso. */
  function repartir(monto, porcentajeAgustin) {
    var m = redondear(Number(monto) || 0);
    var agustin = redondear(m * (Number(porcentajeAgustin) || 0));
    return { agustin: agustin, local: m - agustin };
  }

  // ───────────────────────────── Teléfonos ─────────────────────────────

  /**
   * Lleva cualquier forma de escribir un celular argentino a "+549" + 10 dígitos.
   * "+54 11 …", "54 11 …", "11 …", "15 …" (usa la característica de CONFIG), "011 15 …".
   * Si no se puede (número a medias), devuelve "".
   */
  function normalizarTelefono(valor, caracteristica) {
    if (valor === null || valor === undefined) return '';
    var car = texto(caracteristica).replace(/\D/g, '');
    var d = String(valor).replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.indexOf('54') === 0 && d.length >= 12) {
      d = d.slice(2);
      if (d.charAt(0) === '9' && (d.length === 11 || d.length === 13)) d = d.slice(1);
    } else if (d.charAt(0) === '0') {
      d = d.slice(1);
    }
    if (car && d.length === 12 && d.indexOf(car + '15') === 0) d = car + d.slice(car.length + 2);
    if (car && d.indexOf('15') === 0 && d.length === 12 - car.length) d = car + d.slice(2);
    // Ninguna característica argentina empieza con 15: sin la de CONFIG no se puede adivinar.
    if (d.indexOf('15') === 0) return '';
    return d.length === 10 ? '+549' + d : '';
  }

  function telefonoValido(t) {
    return /^\+549\d{10}$/.test(texto(t));
  }

  /** De "11 5555-0001 ::: 11 5555-0002" devuelve el primero que sirva. */
  function primerTelefonoValido(valor, caracteristica) {
    var partes = texto(valor).split(/:::|[,;\/|]|\s+y\s+|\s+o\s+/);
    for (var i = 0; i < partes.length; i++) {
      var t = normalizarTelefono(partes[i], caracteristica);
      if (t) return t;
    }
    return '';
  }

  /**
   * Busca un teléfono adentro de un texto libre ("Juan 11 5555-0001").
   * Devuelve { telefono, resto, incompleto } — incompleto es el pedazo de número que no alcanza.
   */
  function extraerTelefono(valor, caracteristica) {
    var t = texto(valor);
    var encontrados = t.match(/\+?\d[\d\s\-().]{4,}\d/g) || [];
    for (var i = 0; i < encontrados.length; i++) {
      var tel = normalizarTelefono(encontrados[i], caracteristica);
      if (tel) {
        return { telefono: tel, resto: t.replace(encontrados[i], ' ').replace(/\s+/g, ' ').replace(/^[\s\-–,:]+|[\s\-–,:]+$/g, ''), incompleto: '' };
      }
    }
    var incompleto = '';
    encontrados.forEach(function (e) { if (!incompleto && e.replace(/\D/g, '').length >= 5) incompleto = e.trim(); });
    var resto = incompleto ? t.replace(incompleto, ' ').replace(/\s+/g, ' ').replace(/^[\s\-–,:]+|[\s\-–,:]+$/g, '') : t;
    return { telefono: '', resto: resto, incompleto: incompleto };
  }

  /** "+5491155550001" → "11 5555-0001" (para leer en la hoja). */
  function formatearTelefono(tel, caracteristica) {
    var t = texto(tel);
    if (!telefonoValido(t)) return t;
    var d = t.slice(4);
    var car = texto(caracteristica).replace(/\D/g, '') || d.slice(0, 2);
    if (d.indexOf(car) !== 0) car = d.slice(0, 2);
    var resto = d.slice(car.length);
    return car + ' ' + resto.slice(0, resto.length - 4) + '-' + resto.slice(-4);
  }

  // ───────────────────────────── WhatsApp y mensajes ─────────────────────────────

  function primerNombre(nombre) {
    var t = texto(nombre);
    if (!t || normalizarTexto(t) === 'sin nombre') return '';
    return t.split(/\s+/)[0];
  }

  /** Reemplaza {nombre}, {total}, etc. Lo que no conoce lo deja igual. */
  function completarMensaje(plantilla, datos) {
    var d = {};
    Object.keys(datos || {}).forEach(function (k) { d[claveCodigo(k)] = datos[k]; });
    var salida = texto(plantilla).replace(/\{([^{}]+)\}/g, function (todo, clave) {
      var k = claveCodigo(clave);
      return Object.prototype.hasOwnProperty.call(d, k) ? texto(d[k]) : todo;
    });
    return salida.replace(/[ \t]+([!?,.])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
  }

  /**
   * Link que abre WhatsApp con el texto ya escrito (el envío lo hace él).
   * Con usarBusiness=true arma un link de Android que abre directo WhatsApp Business.
   */
  function linkWhatsapp(telefono, mensaje, usarBusiness) {
    var num = texto(telefono).replace(/\D/g, '');
    if (!num) return '';
    var txt = texto(mensaje) ? encodeURIComponent(texto(mensaje)) : '';
    var wa = 'https://wa.me/' + num + (txt ? '?text=' + txt : '');
    if (!usarBusiness) return wa;
    return 'intent://send/?phone=' + num + (txt ? '&text=' + txt : '') +
      '#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=' +
      encodeURIComponent(wa) + ';end';
  }

  // ───────────────────────────── Fechas ─────────────────────────────

  function dos(n) { return (n < 10 ? '0' : '') + n; }

  function isoDesdePartes(anio, mes, dia) {
    return anio + '-' + dos(mes) + '-' + dos(dia);
  }

  function esFechaISO(v) {
    return /^\d{4}-\d{2}-\d{2}$/.test(texto(v));
  }

  function partesISO_(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(iso));
    return m ? { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) } : null;
  }

  function diasDelMes_(anio, mes) {
    return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  }

  // Las cuentas de días se hacen en UTC sobre el calendario: no dependen de la zona de la compu.
  function sumarDias(iso, n) {
    var p = partesISO_(iso);
    if (!p) return '';
    var d = new Date(Date.UTC(p.anio, p.mes - 1, p.dia + n));
    return isoDesdePartes(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  /** 0 = domingo … 6 = sábado */
  function diaDeSemana(iso) {
    var p = partesISO_(iso);
    return p ? new Date(Date.UTC(p.anio, p.mes - 1, p.dia)).getUTCDay() : -1;
  }

  /** Se reparte de lunes a sábado, salvo los días cargados como "sin reparto". */
  function esDiaDeReparto(iso, diasSinReparto) {
    var dia = diaDeSemana(iso);
    return dia > 0 && (diasSinReparto || []).indexOf(iso) < 0;
  }

  function siguienteDiaDeReparto(iso, diasSinReparto) {
    var f = iso;
    for (var i = 0; i < 60; i++) {
      f = sumarDias(f, 1);
      if (esDiaDeReparto(f, diasSinReparto)) return f;
    }
    return sumarDias(iso, 1);
  }

  /** "11:30" / "11.30" / "11" / "11:30 hs" → minutos desde las 0 hs. */
  function minutosDeHora(v) {
    var t = normalizarTexto(v).replace(/\s*h(?:s|rs)?\.?$/, '').trim();
    var m = /^(\d{1,2})(?:[:.\s,h](\d{2}))?$/.exec(t);
    if (!m) return null;
    var h = Number(m[1]);
    var mi = m[2] ? Number(m[2]) : 0;
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }

  /**
   * Fecha de entrega por defecto: hoy si es de lunes a sábado y todavía no pasó la hora de corte;
   * si no, el siguiente día de reparto.
   */
  function fechaEntregaPorDefecto(hoyIso, horaActual, horaCorte, diasSinReparto) {
    var corte = minutosDeHora(horaCorte);
    var ahora = minutosDeHora(horaActual);
    if (esDiaDeReparto(hoyIso, diasSinReparto) && corte !== null && ahora !== null && ahora < corte) return hoyIso;
    return siguienteDiaDeReparto(hoyIso, diasSinReparto);
  }

  /** Acepta "aaaa-mm-dd", "dd/mm/aaaa", "dd/mm/aa", "dd/mm" (usa el año que le pases). */
  function parsearFecha(valor, anioPorDefecto) {
    var t = texto(valor);
    if (!t) return '';
    var anio;
    var mes;
    var dia;
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
    if (m) {
      anio = Number(m[1]); mes = Number(m[2]); dia = Number(m[3]);
    } else {
      m = /^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?(?!\d)/.exec(t);
      if (!m) return '';
      dia = Number(m[1]); mes = Number(m[2]);
      anio = m[3] ? Number(m[3]) : Number(anioPorDefecto);
      if (anio < 100) anio += 2000;
    }
    if (!anio || mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes_(anio, mes)) return '';
    return isoDesdePartes(anio, mes, dia);
  }

  /** "2026-10-05" → "05/10/2026" */
  function formatearFecha(iso) {
    var p = partesISO_(iso);
    return p ? dos(p.dia) + '/' + dos(p.mes) + '/' + p.anio : '';
  }

  /** "2026-10-05" → "lun 5/10" */
  function formatearFechaCorta(iso) {
    var p = partesISO_(iso);
    return p ? DIAS_CORTOS[diaDeSemana(iso)] + ' ' + p.dia + '/' + p.mes : '';
  }

  /** "2026-10-05" → "lunes 5 de octubre" */
  function formatearFechaLarga(iso) {
    var p = partesISO_(iso);
    return p ? DIAS[diaDeSemana(iso)] + ' ' + p.dia + ' de ' + MESES[p.mes - 1] : '';
  }

  /** Para los mensajes: "hoy", "mañana" o "el lunes 5/10". */
  function fechaRelativa(iso, hoyIso) {
    if (!esFechaISO(iso)) return '';
    if (iso === hoyIso) return 'hoy';
    if (iso === sumarDias(hoyIso, 1)) return 'mañana';
    var p = partesISO_(iso);
    return 'el ' + DIAS[diaDeSemana(iso)] + ' ' + p.dia + '/' + p.mes;
  }

  /** Fecha y hora de un instante en la zona indicada (Buenos Aires si no se aclara). */
  function partesFechaEnZona(fecha, zona) {
    var f = new Intl.DateTimeFormat('en-CA', {
      timeZone: zona || ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    var p = {};
    f.formatToParts(fecha).forEach(function (x) { p[x.type] = x.value; });
    var hora = (p.hour === '24' ? '00' : p.hour) + ':' + p.minute;
    var iso = p.year + '-' + p.month + '-' + p.day;
    return { fecha: iso, hora: hora, sello: iso + ' ' + hora + ':' + p.second };
  }

  // ───────────────────────────── Configuración ─────────────────────────────

  /**
   * Convierte las filas de CONFIG ([clave, valor]) en un objeto con tipos.
   * Las claves se comparan sin acentos ni mayúsculas.
   */
  function interpretarConfig(pares, anioActual) {
    var mapa = {};
    (pares || []).forEach(function (par) {
      var k = normalizarTexto(par && par[0]);
      if (k) mapa[k] = par[1];
    });
    function v(campo) {
      var x = mapa[normalizarTexto(CLAVES_CONFIG[campo])];
      return x === undefined || x === null ? '' : x;
    }
    var porcentajeAgustin = parsearPorcentaje(v('porcentajeAgustin'));
    var porcentajeLocal = parsearPorcentaje(v('porcentajeLocal'));
    if (porcentajeLocal === null && porcentajeAgustin !== null) porcentajeLocal = Number((1 - porcentajeAgustin).toFixed(6));
    var paradas = parsearCantidad(v('paradasPorLink'));
    var cfg = {
      nombreNegocio: texto(v('nombreNegocio')),
      direccionLocal: texto(v('direccionLocal')),
      porcentajeAgustin: porcentajeAgustin,
      porcentajeLocal: porcentajeLocal,
      margenMinimo: parsearPorcentaje(v('margenMinimo')),
      mediosPago: parsearLista(v('mediosPago')),
      origenes: parsearLista(v('origenes')),
      origenEnRuta: texto(v('origenEnRuta')),
      horaCorte: texto(v('horaCorte')),
      diasSinReparto: parsearLista(v('diasSinReparto'))
        .map(function (f) { return parsearFecha(f, anioActual); }).filter(Boolean),
      umbralMayorista: parsearCantidad(v('umbralMayorista')),
      envioPorDefecto: parsearPesos(v('envioPorDefecto')) || 0,
      caracteristica: texto(v('caracteristica')).replace(/\D/g, ''),
      localidadPorDefecto: texto(v('localidadPorDefecto')),
      sufijoDirecciones: texto(v('sufijoDirecciones')),
      // 9 es el máximo de paradas intermedias que acepta un link de Google Maps.
      paradasPorLink: paradas && paradas >= 1 ? Math.floor(paradas) : 9,
      ordenCategorias: parsearLista(v('ordenCategorias')),
      carpetaHojas: texto(v('carpetaHojas')),
      whatsappBusiness: esSi(v('whatsappBusiness')),
      mensajeAvisoVoy: texto(v('mensajeAvisoVoy')),
      mensajeNoEstaba: texto(v('mensajeNoEstaba')),
      mensajeConfirmacion: texto(v('mensajeConfirmacion')),
      idClientesImportar: texto(v('idClientesImportar')),
      idVentasImportar: texto(v('idVentasImportar'))
    };
    cfg.faltantes = CONFIG_OBLIGATORIA.filter(function (campo) {
      var x = cfg[campo];
      return x === null || x === '' || (Array.isArray(x) && !x.length);
    }).map(function (campo) { return CLAVES_CONFIG[campo]; });
    cfg.avisos = [];
    if (porcentajeAgustin !== null && porcentajeLocal !== null &&
        Math.abs(porcentajeAgustin + porcentajeLocal - 1) > 0.0001) {
      cfg.avisos.push('Los porcentajes de Agustín y del local no suman 100%: se usa el de Agustín y el resto va al local.');
    }
    return cfg;
  }

  // ───────────────────────────── Catálogo, precios y costos ─────────────────────────────

  function pluralizar_(palabra) {
    if (!palabra) return palabra;
    if (/ón$/i.test(palabra)) return palabra.replace(/ón$/i, 'ones');
    if (/[aeiouáéíóú]$/i.test(palabra)) return palabra + 's';
    if (/[lnrdj]$/i.test(palabra)) return palabra + 'es';
    return palabra;
  }

  /** Unidad para mostrar al lado de la cantidad: "kg", "maples", "medio cajón"… o "" para unidades sueltas. */
  function unidadParaMostrar(cantidad, unidad) {
    var u = texto(unidad);
    var n = normalizarTexto(u);
    if (!n || /^(u|un|unidad|unidades|promo)$/.test(n)) return '';
    if (/^(kg|kilo|kilos|kgs)$/.test(n)) return 'kg';
    if (Number(cantidad) === 1) return u;
    return u.split(' ').map(pluralizar_).join(' ');
  }

  /**
   * Arma el catálogo que usa la app con lo que hay en COSTOS, PRECIOS y PROMOS VIGENTES.
   * Si un código no tiene costo queda marcado como "costo faltante": nunca se inventa.
   */
  function armarCatalogo(entrada) {
    entrada = entrada || {};
    var costosBase = {};
    (entrada.costos || []).forEach(function (c) {
      var codigo = normalizarCodigo(c.codigo);
      if (!codigo || costosBase[codigo]) return;
      var costo = parsearMonto(c.costo);
      costosBase[codigo] = {
        codigo: codigo,
        producto: texto(c.producto),
        unidad: texto(c.unidadBase),
        categoria: texto(c.categoria) || 'Otros',
        costo: costo === null || costo <= 0 ? null : costo
      };
    });

    var items = [];
    var porCodigo = {};

    (entrada.precios || []).forEach(function (p) {
      var codigo = normalizarCodigo(p.codigo);
      if (!codigo || porCodigo[codigo]) return;
      var cb = costosBase[codigo];
      var base = parsearCantidad(p.base);
      if (!base) base = 1;
      var paso = parsearCantidad(p.paso);
      if (!paso) paso = 1;
      var unidad = texto(p.unidad) || (cb ? cb.unidad : '') || 'unidad';
      var esMaple = /maple/.test(normalizarTexto(cb ? cb.unidad : unidad));
      var precio = parsearPesos(p.precio);
      var sinCosto = !cb || cb.costo === null;
      var item = {
        codigo: codigo,
        tipo: 'producto',
        nombre: texto(p.nombre) || (cb ? cb.producto : '') || codigo,
        unidad: unidad,
        unidadBase: cb ? cb.unidad : '',
        categoria: cb ? cb.categoria : 'Otros',
        precio: precio !== null && precio > 0 ? precio : null,
        base: base,
        baseCargada: parsearCantidad(p.base) !== null,
        paso: paso,
        maplesPorUnidad: esMaple ? base : 0,
        costo: sinCosto ? 0 : redondear(cb.costo * base),
        costoFaltante: sinCosto,
        faltantes: sinCosto ? [codigo] : [],
        activo: texto(p.activo) === '' ? true : esSi(p.activo),
        revisar: false,
        componentes: []
      };
      items.push(item);
      porCodigo[codigo] = item;
    });

    var composicion = {};
    (entrada.composicion || []).forEach(function (c) {
      var promo = claveCodigo(c.promo);
      var codigo = normalizarCodigo(c.codigo);
      var cantidad = parsearCantidad(c.cantidad);
      if (!promo || !codigo || !cantidad) return;
      (composicion[promo] = composicion[promo] || []).push({ codigo: codigo, cantidad: cantidad });
    });

    (entrada.promos || []).forEach(function (p) {
      var codigo = normalizarCodigo(p.codigo);
      if (!codigo || porCodigo[codigo]) return;
      var nombre = texto(p.nombre) || codigo;
      var componentes = composicion[claveCodigo(codigo)] || composicion[claveCodigo(nombre)] || [];
      var costo = 0;
      var faltantes = [];
      componentes.forEach(function (c) {
        var cb = costosBase[c.codigo];
        if (!cb || cb.costo === null) faltantes.push(c.codigo);
        else costo += cb.costo * c.cantidad;
      });
      if (!componentes.length) faltantes.push('(sin composición)');
      var precio = parsearPesos(p.precio);
      var item = {
        codigo: codigo,
        tipo: 'promo',
        nombre: nombre,
        unidad: 'promo',
        unidadBase: '',
        categoria: 'Promos',
        precio: precio !== null && precio > 0 ? precio : null,
        base: 1,
        baseCargada: true,
        paso: 1,
        maplesPorUnidad: 0,
        costo: redondear(costo),
        costoFaltante: faltantes.length > 0,
        faltantes: faltantes,
        activo: texto(p.activa) === '' ? true : esSi(p.activa),
        revisar: /revis/.test(normalizarTexto(p.revisar)),
        componentes: componentes
      };
      items.push(item);
      porCodigo[codigo] = item;
    });

    return { items: items, porCodigo: porCodigo, costosBase: costosBase };
  }

  function itemDe_(catalogo, codigo) {
    return catalogo && catalogo.porCodigo ? catalogo.porCodigo[normalizarCodigo(codigo)] || null : null;
  }

  /**
   * Calcula un pedido: precio sugerido por línea, total, costo y si es mayorista.
   * lineas: [{ codigo, cantidad, precioUnitario }] — precioUnitario es el que puso él a mano (o null).
   * Desde N maples (CONFIG) no se sugiere precio de huevos: lo pone él.
   */
  function calcularPedido(lineas, catalogo, opciones) {
    opciones = opciones || {};
    var umbral = Number(opciones.umbralMayorista) || 0;
    var limpias = (lineas || []).map(function (l) {
      return {
        codigo: normalizarCodigo(l.codigo),
        cantidad: parsearCantidad(l.cantidad) || 0,
        manual: l.precioUnitario === null || l.precioUnitario === undefined || l.precioUnitario === '' ? null : parsearPesos(l.precioUnitario),
        descripcion: texto(l.descripcion)
      };
    }).filter(function (l) { return l.codigo && l.cantidad > 0; });

    var maples = 0;
    limpias.forEach(function (l) {
      var item = itemDe_(catalogo, l.codigo);
      if (item && item.tipo === 'producto') maples += l.cantidad * item.maplesPorUnidad;
    });
    maples = Number(maples.toFixed(3));
    var mayorista = umbral > 0 && maples >= umbral;

    var totalSugerido = 0;
    var costo = 0;
    var costoIncompleto = false;
    var faltanPrecios = 0;
    var resultado = limpias.map(function (l) {
      var item = itemDe_(catalogo, l.codigo);
      var sugerido = item ? item.precio : null;
      if (item && item.tipo === 'producto' && mayorista && item.maplesPorUnidad > 0) sugerido = null;
      var precio = l.manual !== null ? l.manual : sugerido;
      var total = precio === null ? 0 : multiplicarPesos(precio, l.cantidad);
      var costoUnitario = item ? item.costo : 0;
      var faltaCosto = !item || item.costoFaltante;
      var costoLinea = multiplicarPesos(costoUnitario, l.cantidad);
      totalSugerido += total;
      costo += costoLinea;
      if (faltaCosto) costoIncompleto = true;
      if (precio === null) faltanPrecios++;
      return {
        codigo: l.codigo,
        cantidad: l.cantidad,
        precioSugerido: sugerido,
        precioUnitario: precio,
        requierePrecio: precio === null,
        total: total,
        costoUnitario: costoUnitario,
        costo: costoLinea,
        costoFaltante: faltaCosto,
        descripcion: item ? item.nombre : (l.descripcion || l.codigo),
        tipo: item ? item.tipo : 'desconocido'
      };
    });
    return {
      lineas: resultado,
      totalSugerido: totalSugerido,
      costo: costo,
      costoIncompleto: costoIncompleto,
      maples: maples,
      mayorista: mayorista,
      faltanPrecios: faltanPrecios
    };
  }

  /** "2 maples Huevo blanco, 0,5 kg Queso fresco, 1 PROMO FULL" */
  function detalleLineas(lineas, catalogo) {
    return (lineas || []).filter(function (l) { return Number(l.cantidad) > 0; }).map(function (l) {
      var item = itemDe_(catalogo, l.codigo);
      var nombre = item ? item.nombre : (texto(l.descripcion) || texto(l.codigo));
      var unidad = item && item.tipo === 'producto' ? unidadParaMostrar(l.cantidad, item.unidad) : '';
      return formatearCantidad(l.cantidad) + ' ' + (unidad ? unidad + ' ' : '') + nombre;
    }).join(', ');
  }

  /** Productos o promos con margen bajo, sin costo o sin precio. Es lo que va a la pestaña AVISOS. */
  function calcularAvisos(catalogo, margenMinimo) {
    var avisos = [];
    var vistos = {};
    function agregar(tipo, codigo, nombre, detalle) {
      var k = tipo + '|' + codigo;
      if (vistos[k]) return;
      vistos[k] = true;
      avisos.push({ tipo: tipo, codigo: codigo, nombre: nombre, detalle: detalle });
    }
    var costosBase = (catalogo && catalogo.costosBase) || {};
    Object.keys(costosBase).forEach(function (codigo) {
      if (costosBase[codigo].costo === null) {
        agregar('Costo faltante', codigo, costosBase[codigo].producto, 'No tiene "Costo unitario base" en COSTOS.');
      }
    });
    ((catalogo && catalogo.items) || []).forEach(function (item) {
      if (!item.activo) return;
      if (item.costoFaltante) {
        var det = item.tipo === 'promo'
          ? 'No se puede calcular el costo. Falta: ' + item.faltantes.join(', ') + '.'
          : (costosBase[item.codigo] ? 'No tiene "Costo unitario base" en COSTOS.' : 'El código no está en COSTOS.');
        agregar('Costo faltante', item.codigo, item.nombre, det);
      }
      if (item.precio === null) {
        agregar('Precio vacío', item.codigo, item.nombre, 'La app te va a pedir el precio a mano.');
      } else if (!item.costoFaltante && margenMinimo !== null && margenMinimo !== undefined) {
        var m = margen(item.precio, item.costo);
        if (m !== null && m < margenMinimo) {
          agregar('Margen bajo', item.codigo, item.nombre, 'Margen ' + formatearPorcentaje(m) + ' (mínimo ' +
            formatearPorcentaje(margenMinimo) + '): precio ' + formatearPesos(item.precio) + ', costo ' + formatearPesos(item.costo) + '.');
        }
      }
      if (item.revisar) {
        agregar('Promo a revisar', item.codigo, item.nombre, 'Confirmá precio y composición y borrá la marca "a revisar".');
      }
      if (item.tipo === 'producto' && !item.baseCargada && item.unidadBase &&
          normalizarTexto(item.unidad) !== normalizarTexto(item.unidadBase)) {
        agregar('Revisar unidades', item.codigo, item.nombre, 'Se vende por "' + item.unidad + '" pero el costo es por "' +
          item.unidadBase + '": completá "Unidades base por unidad de venta" en PRECIOS.');
      }
    });
    return avisos;
  }

  // ───────────────────────────── Pedidos ─────────────────────────────

  function normalizarEstado(v) {
    var t = normalizarTexto(v);
    if (!t) return '';
    if (/^entreg/.test(t) || /^cobrad/.test(t)) return ESTADOS.ENTREGADO;
    if (/^no estaba/.test(t) || /^ausente/.test(t)) return ESTADOS.NO_ESTABA;
    if (/^cancel/.test(t)) return ESTADOS.CANCELADO;
    if (/^confirm/.test(t) || /^pendiente/.test(t)) return ESTADOS.CONFIRMADO;
    return t;
  }

  function normalizarVuelta(v) {
    var t = normalizarTexto(v);
    if (!t) return '';
    if (/ruta/.test(t)) return VUELTAS.EN_RUTA;
    if (/^(2|2da|2a|segunda)/.test(t)) return VUELTAS.SEGUNDA;
    if (/^(1|1ra|1a|primera)/.test(t)) return VUELTAS.PRIMERA;
    return t;
  }

  function esEstadoFinal(estado) {
    var e = normalizarEstado(estado);
    return e === ESTADOS.ENTREGADO || e === ESTADOS.NO_ESTABA || e === ESTADOS.CANCELADO;
  }

  /** Calle y altura: tiene que tener al menos una palabra y un número ("Mitre 1234", "Calle 14 1234"). */
  function direccionCompleta(calle) {
    var t = texto(calle);
    return /\d/.test(t) && t.split(/\s+/).filter(Boolean).length >= 2;
  }

  /** Lo que se le pasa a Google Maps para encontrar la dirección. */
  function direccionParaMapa(p, config) {
    config = config || {};
    var lugar = texto(p.barrio) || texto(config.localidadPorDefecto);
    return [texto(p.direccion), lugar, texto(config.sufijoDirecciones)].filter(Boolean).join(', ');
  }

  function linkMapsBusqueda(direccion) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(texto(direccion));
  }

  /**
   * Links de ruta de Google Maps (formato dir/?api=1). Si hay más paradas de las que entran en un
   * link, lo parte en varios: cada uno arranca donde terminó el anterior.
   */
  function armarLinksRuta(origen, paradas, maxIntermedias) {
    var porLink = Math.max(1, Math.floor(Number(maxIntermedias) || 1)) + 1;
    var lista = (paradas || []).map(texto).filter(Boolean);
    var links = [];
    var desde = texto(origen);
    var i = 0;
    while (i < lista.length) {
      var tramo = lista.slice(i, i + porLink);
      var destino = tramo[tramo.length - 1];
      var intermedias = tramo.slice(0, -1);
      var url = 'https://www.google.com/maps/dir/?api=1' +
        (desde ? '&origin=' + encodeURIComponent(desde) : '') +
        '&destination=' + encodeURIComponent(destino) +
        (intermedias.length ? '&waypoints=' + intermedias.map(encodeURIComponent).join('%7C') : '') +
        '&travelmode=driving';
      links.push({ url: url, desde: i + 1, hasta: i + tramo.length });
      desde = destino;
      i += tramo.length;
    }
    return links;
  }

  /** Vuelta de un pedido nuevo: si la hoja de ese día ya se imprimió, va a la 2da. */
  function vueltaParaPedido(fechaEntrega, hojasImpresas, esEnRuta) {
    if (esEnRuta) return VUELTAS.EN_RUTA;
    if (fechaEntrega && (hojasImpresas || []).indexOf(fechaEntrega) >= 0) return VUELTAS.SEGUNDA;
    return VUELTAS.PRIMERA;
  }

  /** Mayor número de orden usado en cada fecha: { "2026-10-05": 4 } */
  function ordenesPorFecha(pedidos) {
    var r = {};
    (pedidos || []).forEach(function (p) {
      var o = Number(p.orden) || 0;
      if (p.fechaEntrega && o > (r[p.fechaEntrega] || 0)) r[p.fechaEntrega] = o;
    });
    return r;
  }

  function aCobrar(p) {
    return (parsearPesos(p.totalCobrado) || 0) + (parsearPesos(p.envio) || 0);
  }

  /**
   * Prepara un pedido para guardar (lo usan la web app y la planilla, así dan lo mismo).
   * datos: lo que cargó él. existente: el pedido como estaba (o null si es nuevo).
   * ctx: { catalogo, config, ahora, hojasImpresas, ordenes }
   */
  function prepararPedido(datos, existente, ctx) {
    ctx = ctx || {};
    var cfg = ctx.config || {};
    var ex = existente || null;
    var id = texto(datos.id);
    if (!id) throw new Error('El pedido no tiene ID.');
    var fecha = parsearFecha(datos.fechaEntrega, texto(ctx.ahora).slice(0, 4));
    var esEnRuta = datos.enRuta === true || normalizarVuelta(datos.vuelta) === VUELTAS.EN_RUTA ||
      (ex && normalizarVuelta(ex.vuelta) === VUELTAS.EN_RUTA);
    var mismaFecha = ex && ex.fechaEntrega === fecha;
    var vuelta = esEnRuta ? VUELTAS.EN_RUTA
      : (mismaFecha && ex.vuelta ? normalizarVuelta(ex.vuelta) : vueltaParaPedido(fecha, ctx.hojasImpresas, false));
    var orden = mismaFecha && ex.orden ? Number(ex.orden)
      : (fecha ? ((ctx.ordenes || {})[fecha] || 0) + 1 : '');
    var calc = calcularPedido(datos.lineas, ctx.catalogo, { umbralMayorista: cfg.umbralMayorista });
    var totalCobrado = parsearPesos(datos.totalCobrado);
    if (totalCobrado === null) totalCobrado = calc.totalSugerido;
    var envio = parsearPesos(datos.envio) || 0;
    var estado = datos.estado ? normalizarEstado(datos.estado)
      : (ex && ex.estado ? normalizarEstado(ex.estado) : (esEnRuta ? ESTADOS.ENTREGADO : ESTADOS.CONFIRMADO));
    var medio = datos.medio !== undefined ? texto(datos.medio) : (ex ? texto(ex.medio) : '');
    if (estado === ESTADOS.CONFIRMADO) medio = '';
    var pedido = {
      id: id,
      fechaCarga: ex && ex.fechaCarga ? ex.fechaCarga : texto(ctx.ahora),
      fechaEntrega: fecha,
      vuelta: vuelta,
      orden: orden,
      telefono: normalizarTelefono(datos.telefono, cfg.caracteristica),
      cliente: texto(datos.cliente) || 'Sin nombre',
      direccion: texto(datos.direccion),
      entreCalles: texto(datos.entreCalles),
      barrio: texto(datos.barrio),
      referencia: texto(datos.referencia),
      horario: texto(datos.horario),
      totalSugerido: calc.totalSugerido,
      totalCobrado: totalCobrado,
      envio: envio,
      costo: calc.costo,
      ganancia: totalCobrado + envio - calc.costo,
      origen: texto(datos.origen) || (esEnRuta ? texto(cfg.origenEnRuta) : (ex ? texto(ex.origen) : '')),
      estado: estado,
      medio: medio,
      notas: texto(datos.notas),
      detalle: detalleLineas(calc.lineas, ctx.catalogo),
      costoIncompleto: calc.costoIncompleto,
      actualizado: texto(ctx.ahora)
    };
    var lineas = calc.lineas.map(function (l) {
      return {
        pedido: id,
        codigo: l.codigo,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        costoUnitario: l.costoUnitario,
        descripcion: l.descripcion
      };
    });
    var avisos = [];
    if (calc.faltanPrecios) avisos.push('Hay ' + calc.faltanPrecios + ' producto(s) sin precio.');
    if (!lineas.length) avisos.push('El pedido no tiene productos.');
    return { pedido: pedido, lineas: lineas, avisos: avisos, calculo: calc };
  }

  /**
   * Cambios rápidos sobre un pedido ya cargado (entregado, cobrado, no estaba, reprogramar, monto).
   * Devuelve { pedido, campos } con los campos que cambiaron.
   */
  function aplicarCambiosPedido(pedido, cambios, ctx) {
    ctx = ctx || {};
    var p = {};
    Object.keys(pedido).forEach(function (k) { p[k] = pedido[k]; });
    var campos = [];
    function poner(campo, valor) {
      if (p[campo] !== valor) { p[campo] = valor; if (campos.indexOf(campo) < 0) campos.push(campo); }
    }
    cambios = cambios || {};
    if (cambios.fechaEntrega !== undefined) {
      var f = parsearFecha(cambios.fechaEntrega, texto(ctx.ahora).slice(0, 4));
      if (f !== p.fechaEntrega) {
        poner('fechaEntrega', f);
        if (normalizarVuelta(p.vuelta) !== VUELTAS.EN_RUTA) poner('vuelta', vueltaParaPedido(f, ctx.hojasImpresas, false));
        poner('orden', f ? ((ctx.ordenes || {})[f] || 0) + 1 : '');
      }
      if (normalizarEstado(p.estado) === ESTADOS.NO_ESTABA) poner('estado', ESTADOS.CONFIRMADO);
    }
    if (cambios.estado !== undefined) poner('estado', normalizarEstado(cambios.estado));
    if (cambios.medio !== undefined) {
      poner('medio', texto(cambios.medio));
      if (texto(cambios.medio)) poner('estado', ESTADOS.ENTREGADO);
    }
    if (normalizarEstado(p.estado) !== ESTADOS.ENTREGADO) poner('medio', '');
    if (cambios.totalCobrado !== undefined) {
      var t = parsearPesos(cambios.totalCobrado);
      if (t !== null) poner('totalCobrado', t);
    }
    if (cambios.orden !== undefined) poner('orden', Number(cambios.orden) || '');
    if (cambios.notas !== undefined) poner('notas', texto(cambios.notas));
    poner('ganancia', aCobrar(p) - (parsearPesos(p.costo) || 0));
    if (campos.length) poner('actualizado', texto(ctx.ahora));
    return { pedido: p, campos: campos };
  }

  /** Por qué un pedido está en PENDIENTES ("" si no está). */
  function motivoPendiente(p, hoyIso) {
    var estado = normalizarEstado(p.estado);
    if (estado === ESTADOS.NO_ESTABA) return 'No estaba';
    if (estado !== ESTADOS.CONFIRMADO && estado !== '') return '';
    if (normalizarVuelta(p.vuelta) === VUELTAS.EN_RUTA) return '';
    if (!direccionCompleta(p.direccion)) return 'Falta la dirección';
    if (!esFechaISO(p.fechaEntrega)) return 'Sin fecha de entrega';
    if (hoyIso && p.fechaEntrega < hoyIso) return 'Quedó de un día anterior';
    return '';
  }

  /** Orden para mostrar en HOY: primero lo que falta entregar (en orden de ruta), después lo resuelto. */
  function ordenarParaHoy(pedidos) {
    function grupo(p) {
      var e = normalizarEstado(p.estado);
      if (e === ESTADOS.CONFIRMADO || e === '') return 0;
      if (e === ESTADOS.ENTREGADO) return 1;
      if (e === ESTADOS.NO_ESTABA) return 2;
      return 3;
    }
    return (pedidos || []).slice().sort(function (a, b) {
      return grupo(a) - grupo(b) || (Number(a.orden) || 9999) - (Number(b.orden) || 9999) ||
        texto(a.fechaCarga).localeCompare(texto(b.fechaCarga));
    });
  }

  /** Aplica el orden que devolvió Google (waypoint_order) a la lista de IDs. */
  function aplicarOrdenOptimizado(ids, ordenGoogle) {
    var salida = [];
    (ordenGoogle || []).forEach(function (i) { if (ids[i] !== undefined && salida.indexOf(ids[i]) < 0) salida.push(ids[i]); });
    ids.forEach(function (id) { if (salida.indexOf(id) < 0) salida.push(id); });
    return salida;
  }

  /**
   * Nuevo orden del día después de "Ordenar ruta".
   * Lo ya resuelto queda primero; después lo pendiente (1ra y luego 2da). La vuelta elegida
   * toma el orden optimizado; el resto mantiene el que tenía.
   * Devuelve [{ id, orden }].
   */
  function nuevaSecuencia(pedidosDelDia, idsOptimizados, vuelta) {
    var porOrden = (pedidosDelDia || []).slice().sort(function (a, b) {
      return (Number(a.orden) || 9999) - (Number(b.orden) || 9999);
    });
    var finales = porOrden.filter(function (p) { return esEstadoFinal(p.estado); });
    var pendientes = porOrden.filter(function (p) { return !esEstadoFinal(p.estado); });
    var v = normalizarVuelta(vuelta);
    var todas = !v || v === 'todas' || v === 'todo';
    function enSeleccion(p) { return todas || normalizarVuelta(p.vuelta) === v; }
    var seleccion = pendientes.filter(enSeleccion);
    var idsSel = seleccion.map(function (p) { return p.id; });
    var optimizado = (idsOptimizados || []).filter(function (id) { return idsSel.indexOf(id) >= 0; });
    idsSel.forEach(function (id) { if (optimizado.indexOf(id) < 0) optimizado.push(id); });
    var secuencia = finales.map(function (p) { return p.id; });
    if (todas) {
      secuencia = secuencia.concat(optimizado);
    } else {
      var resto = pendientes.filter(function (p) { return !enSeleccion(p); });
      var restoPrimera = resto.filter(function (p) { return normalizarVuelta(p.vuelta) !== VUELTAS.SEGUNDA; }).map(function (p) { return p.id; });
      var restoSegunda = resto.filter(function (p) { return normalizarVuelta(p.vuelta) === VUELTAS.SEGUNDA; }).map(function (p) { return p.id; });
      secuencia = v === VUELTAS.SEGUNDA
        ? secuencia.concat(restoPrimera, optimizado, restoSegunda)
        : secuencia.concat(optimizado, restoPrimera, restoSegunda);
    }
    return secuencia.map(function (id, i) { return { id: id, orden: i + 1 }; });
  }

  function nombreVuelta(vuelta) {
    var v = normalizarVuelta(vuelta);
    if (v === VUELTAS.PRIMERA) return '1ra vuelta';
    if (v === VUELTAS.SEGUNDA) return '2da vuelta';
    if (v === VUELTAS.EN_RUTA) return 'en ruta';
    return 'todo el día';
  }

  /** ¿Este pedido entra en la vuelta pedida? ("todas" = todo el día) */
  function entraEnVuelta(p, vuelta) {
    var v = normalizarVuelta(vuelta);
    if (!v || v === 'todas' || v === 'todo') return normalizarVuelta(p.vuelta) !== VUELTAS.EN_RUTA;
    if (v === VUELTAS.PRIMERA) return normalizarVuelta(p.vuelta) === VUELTAS.PRIMERA || normalizarVuelta(p.vuelta) === '';
    return normalizarVuelta(p.vuelta) === v;
  }

  // ───────────────────────────── Carga y cierre ─────────────────────────────

  function ordenarCategorias_(categorias, orden) {
    var ordenNorm = (orden || []).map(normalizarTexto);
    return categorias.slice().sort(function (a, b) {
      var ia = ordenNorm.indexOf(normalizarTexto(a));
      var ib = ordenNorm.indexOf(normalizarTexto(b));
      if (ia < 0) ia = 999;
      if (ib < 0) ib = 999;
      return ia - ib || a.localeCompare(b);
    });
  }

  /**
   * Total de mercadería a cargar, agrupado por categoría (las promos se abren en sus productos).
   * Devuelve [{ categoria, filas: [{ codigo, nombre, cantidad, unidad, texto }] }].
   */
  function cargaPorCategoria(pedidos, catalogo, ordenCategorias) {
    var costosBase = (catalogo && catalogo.costosBase) || {};
    var acumulado = {};
    function sumar(codigo, cantidad, itemVenta) {
      var cb = costosBase[codigo];
      var item = itemDe_(catalogo, codigo) || itemVenta;
      var categoria = cb ? cb.categoria : (item ? item.categoria : 'Otros');
      var unidad = cb ? cb.unidad : (item ? item.unidad : '');
      var nombre = item && item.tipo === 'producto' ? item.nombre : (cb ? cb.producto : codigo);
      var k = codigo;
      if (!acumulado[k]) acumulado[k] = { codigo: codigo, nombre: nombre || codigo, categoria: categoria, unidad: unidad, cantidad: 0 };
      acumulado[k].cantidad += cantidad;
    }
    (pedidos || []).forEach(function (p) {
      (p.lineas || []).forEach(function (l) {
        var cant = Number(l.cantidad) || 0;
        if (cant <= 0) return;
        var item = itemDe_(catalogo, l.codigo);
        if (item && item.tipo === 'promo') {
          item.componentes.forEach(function (c) { sumar(c.codigo, c.cantidad * cant, null); });
        } else {
          sumar(normalizarCodigo(l.codigo), cant * (item ? item.base : 1), item || { tipo: 'producto', nombre: texto(l.descripcion) || l.codigo, categoria: 'Otros', unidad: '' });
        }
      });
    });
    var porCategoria = {};
    Object.keys(acumulado).forEach(function (k) {
      var f = acumulado[k];
      f.cantidad = Number(f.cantidad.toFixed(3));
      var u = unidadParaMostrar(f.cantidad, f.unidad);
      f.texto = formatearCantidad(f.cantidad) + (u ? ' ' + u : '');
      (porCategoria[f.categoria] = porCategoria[f.categoria] || []).push(f);
    });
    return ordenarCategorias_(Object.keys(porCategoria), ordenCategorias).map(function (cat) {
      return {
        categoria: cat,
        filas: porCategoria[cat].sort(function (a, b) { return a.nombre.localeCompare(b.nombre); })
      };
    });
  }

  /** Unidades vendidas por categoría y unidad ("Huevos: 12 maples"). */
  function unidadesPorCategoria(pedidos, catalogo, ordenCategorias) {
    var salida = [];
    cargaPorCategoria(pedidos, catalogo, ordenCategorias).forEach(function (g) {
      var porUnidad = {};
      g.filas.forEach(function (f) {
        var u = normalizarTexto(f.unidad) || 'unidad';
        if (!porUnidad[u]) porUnidad[u] = { categoria: g.categoria, unidad: f.unidad || 'unidad', cantidad: 0 };
        porUnidad[u].cantidad += f.cantidad;
      });
      Object.keys(porUnidad).forEach(function (u) {
        var x = porUnidad[u];
        x.cantidad = Number(x.cantidad.toFixed(3));
        var um = unidadParaMostrar(x.cantidad, x.unidad);
        x.texto = formatearCantidad(x.cantidad) + (um ? ' ' + um : ' u.');
        salida.push(x);
      });
    });
    return salida;
  }

  /** "Mercado Pago" → "MP"; "Efectivo" → "Efectivo" */
  function etiquetaCorta(medio) {
    var palabras = texto(medio).split(/\s+/).filter(Boolean);
    if (palabras.length > 1) return palabras.map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
    return texto(medio);
  }

  // ¿Las letras de "corto" aparecen en orden dentro de "largo"? ("efvo" en "efectivo")
  function esAbreviatura_(corto, largo) {
    if (corto.length < 3 || corto.charAt(0) !== largo.charAt(0)) return false;
    var j = 0;
    for (var i = 0; i < largo.length && j < corto.length; i++) if (largo.charAt(i) === corto.charAt(j)) j++;
    return j === corto.length;
  }

  /** Lleva "mp", "mercadopago", "efvo"… al nombre que figura en CONFIG. */
  function normalizarMedio(valor, medios) {
    var t = normalizarTexto(valor);
    if (!t) return '';
    var compacto = t.replace(/[^a-z0-9]/g, '');
    var lista = medios || [];
    for (var i = 0; i < lista.length; i++) {
      var mc = normalizarTexto(lista[i]).replace(/[^a-z0-9]/g, '');
      if (compacto === mc || compacto === normalizarTexto(etiquetaCorta(lista[i])) ||
          (mc.length >= 4 && compacto.indexOf(mc) >= 0) || esAbreviatura_(compacto, mc)) {
        return lista[i];
      }
    }
    return texto(valor);
  }

  /**
   * Cierre del día con lo marcado en HOY.
   * e: { fecha, pedidos (con lineas), gastos, retiroReal, porcentajeAgustin, medios, catalogo, ordenCategorias }
   */
  function cierreDelDia(e) {
    var fecha = e.fecha;
    var medios = e.medios || [];
    var delDia = (e.pedidos || []).filter(function (p) { return p.fechaEntrega === fecha; });
    function conEstado(est) { return delDia.filter(function (p) { return normalizarEstado(p.estado) === est; }); }
    var entregados = conEstado(ESTADOS.ENTREGADO);
    var sinEstadoFinal = delDia.filter(function (p) { return !esEstadoFinal(p.estado); });
    var noEstaban = conEstado(ESTADOS.NO_ESTABA);
    var cancelados = conEstado(ESTADOS.CANCELADO);

    var porMedio = {};
    medios.forEach(function (m) { porMedio[m] = 0; });
    var pendienteCobro = 0;
    var costosFaltantes = false;
    var clientes = entregados.map(function (p) {
      var cobrado = aCobrar(p);
      var costo = parsearPesos(p.costo) || 0;
      var medio = normalizarMedio(p.medio, medios);
      if (medio) porMedio[medio] = (porMedio[medio] || 0) + cobrado;
      else pendienteCobro += cobrado;
      if (p.costoIncompleto === true || esSi(p.costoIncompleto)) costosFaltantes = true;
      return {
        id: p.id,
        cliente: texto(p.cliente) || 'Sin nombre',
        telefono: texto(p.telefono),
        detalle: texto(p.detalle) || detalleLineas(p.lineas, e.catalogo),
        cobrado: cobrado,
        costo: costo,
        ganancia: cobrado - costo,
        margen: margen(cobrado, costo),
        medio: medio,
        vuelta: normalizarVuelta(p.vuelta)
      };
    });
    var ventas = 0;
    var costo = 0;
    clientes.forEach(function (c) { ventas += c.cobrado; costo += c.costo; });
    var gananciaBruta = ventas - costo;

    var gastos = (e.gastos || []).filter(function (g) { return g.fecha === fecha; }).map(function (g) {
      return { id: g.id, descripcion: texto(g.descripcion) || 'Gasto', monto: parsearPesos(g.monto) || 0, noAfecta: g.noAfecta === true || esSi(g.noAfecta) };
    });
    var gastosAfectan = 0;
    var gastosNoAfectan = 0;
    gastos.forEach(function (g) { if (g.noAfecta) gastosNoAfectan += g.monto; else gastosAfectan += g.monto; });
    var gananciaNeta = gananciaBruta - gastosAfectan;
    var reparto = repartir(gananciaNeta, e.porcentajeAgustin);
    // Los gastos que no afectan la ganancia (ej. nafta) son de Agustín y se pagaron con plata del día.
    var retiroCalculado = reparto.agustin - gastosNoAfectan;
    var retiroReal = e.retiroReal === null || e.retiroReal === undefined || e.retiroReal === '' ? null : parsearPesos(e.retiroReal);

    var promos = {};
    entregados.forEach(function (p) {
      (p.lineas || []).forEach(function (l) {
        var item = itemDe_(e.catalogo, l.codigo);
        if (item && item.tipo === 'promo') promos[item.nombre] = (promos[item.nombre] || 0) + (Number(l.cantidad) || 0);
      });
    });

    return {
      fecha: fecha,
      clientes: clientes,
      unidades: unidadesPorCategoria(entregados, e.catalogo, e.ordenCategorias),
      promos: Object.keys(promos).map(function (n) { return { nombre: n, cantidad: promos[n] }; }),
      entregados: entregados.length,
      ventas: ventas,
      costo: costo,
      gananciaBruta: gananciaBruta,
      margen: margen(ventas, costo),
      gastos: gastos,
      gastosAfectan: gastosAfectan,
      gastosNoAfectan: gastosNoAfectan,
      gananciaNeta: gananciaNeta,
      porcentajeAgustin: Number(e.porcentajeAgustin) || 0,
      agustin: reparto.agustin,
      local: reparto.local,
      porMedio: Object.keys(porMedio).map(function (m) { return { medio: m, monto: porMedio[m] }; }),
      pendienteCobro: pendienteCobro,
      retiroCalculado: retiroCalculado,
      retiroReal: retiroReal,
      diferencia: retiroReal === null ? null : retiroReal - retiroCalculado,
      sinEstadoFinal: sinEstadoFinal.map(function (p) { return { id: p.id, cliente: texto(p.cliente) || 'Sin nombre' }; }),
      noEstaban: noEstaban.map(function (p) { return { id: p.id, cliente: texto(p.cliente) || 'Sin nombre' }; }),
      cancelados: cancelados.length,
      costosFaltantes: costosFaltantes
    };
  }

  /**
   * Todo lo que necesita la plantilla Hoja.html para el PDF.
   * e: { fecha, vuelta, pedidos (con lineas, ya filtrados y en orden), catalogo, config, generado }
   */
  function datosHojaReparto(e) {
    var cfg = e.config || {};
    var pedidos = e.pedidos || [];
    var completos = pedidos.filter(function (p) { return direccionCompleta(p.direccion); });
    var sinDireccion = pedidos.filter(function (p) { return !direccionCompleta(p.direccion); });
    function fila(p, i) {
      return {
        n: i + 1,
        cliente: texto(p.cliente) || 'Sin nombre',
        telefono: formatearTelefono(p.telefono, cfg.caracteristica),
        direccion: texto(p.direccion),
        entreCalles: texto(p.entreCalles),
        barrio: texto(p.barrio),
        referencia: acortar(p.referencia, 40),
        horario: texto(p.horario),
        pedido: detalleLineas(p.lineas, e.catalogo) || texto(p.detalle),
        notas: acortar(p.notas, 60),
        precio: formatearPesos(aCobrar(p))
      };
    }
    var total = 0;
    pedidos.forEach(function (p) { total += aCobrar(p); });
    return {
      negocio: texto(cfg.nombreNegocio),
      titulo: 'Hoja de reparto',
      fechaTexto: formatearFechaLarga(e.fecha) + ' ' + formatearFecha(e.fecha).slice(-4),
      vueltaTexto: nombreVuelta(e.vuelta),
      generado: texto(e.generado),
      filas: completos.map(fila),
      pendientes: sinDireccion.map(fila),
      carga: cargaPorCategoria(pedidos, e.catalogo, cfg.ordenCategorias),
      links: armarLinksRuta(cfg.direccionLocal, completos.map(function (p) { return direccionParaMapa(p, cfg); }), cfg.paradasPorLink),
      total: formatearPesos(total),
      cantidad: pedidos.length
    };
  }

  // ───────────────────────────── Clientes ─────────────────────────────

  /** Primera y última compra, cantidad y total gastado, con los pedidos entregados de un cliente. */
  function estadisticasCliente(pedidos) {
    var entregados = (pedidos || []).filter(function (p) {
      return normalizarEstado(p.estado) === ESTADOS.ENTREGADO && esFechaISO(p.fechaEntrega);
    }).sort(function (a, b) {
      return a.fechaEntrega.localeCompare(b.fechaEntrega) || texto(a.fechaCarga).localeCompare(texto(b.fechaCarga));
    });
    if (!entregados.length) return { primeraCompra: '', ultimaCompra: '', cantidadCompras: 0, totalGastado: 0, origenPrimera: '' };
    var total = 0;
    entregados.forEach(function (p) { total += aCobrar(p); });
    var conOrigen = entregados.filter(function (p) { return texto(p.origen); })[0];
    return {
      primeraCompra: entregados[0].fechaEntrega,
      ultimaCompra: entregados[entregados.length - 1].fechaEntrega,
      cantidadCompras: entregados.length,
      totalGastado: total,
      origenPrimera: conOrigen ? texto(conOrigen.origen) : ''
    };
  }

  /** Qué datos de CLIENTES hay que cambiar con un pedido nuevo. */
  function cambiosCliente(existente, datos, actualizarDireccion) {
    var c = {};
    var nombre = texto(datos.nombre);
    if (nombre && normalizarTexto(nombre) !== 'sin nombre' && nombre !== texto(existente.nombre)) c.nombre = nombre;
    ['direccion', 'entreCalles', 'barrio', 'referencia'].forEach(function (campo) {
      var nuevo = texto(datos[campo]);
      if (!nuevo) return;
      if ((actualizarDireccion || !texto(existente[campo])) && nuevo !== texto(existente[campo])) c[campo] = nuevo;
    });
    return c;
  }

  /** Busca clientes por nombre, teléfono o calle. Devuelve los mejores primero. */
  function buscarClientes(clientes, consulta, max) {
    var q = normalizarTexto(consulta);
    if (!q) return [];
    var digitos = texto(consulta).replace(/\D/g, '');
    var palabras = q.replace(/[\d+()\-]/g, ' ').split(' ').filter(Boolean);
    var resultado = [];
    (clientes || []).forEach(function (c) {
      var puntos = 0;
      if (digitos.length >= 3 && texto(c.telefono).replace(/\D/g, '').indexOf(digitos) >= 0) puntos += 5;
      if (palabras.length) {
        var nombre = normalizarTexto(c.nombre);
        var palabrasNombre = nombre.split(' ');
        var todas = palabras.every(function (w) {
          return palabrasNombre.some(function (pn) { return pn.indexOf(w) === 0; }) || nombre.indexOf(w) >= 0;
        });
        if (todas) puntos += nombre.indexOf(palabras.join(' ')) === 0 ? 4 : 3;
        else if (palabras.every(function (w) { return normalizarTexto(c.direccion).indexOf(w) >= 0; })) puntos += 1;
      }
      if (puntos) resultado.push({ c: c, puntos: puntos });
    });
    resultado.sort(function (a, b) {
      return b.puntos - a.puntos || texto(b.c.ultimaCompra).localeCompare(texto(a.c.ultimaCompra)) ||
        texto(a.c.nombre).localeCompare(texto(b.c.nombre));
    });
    return resultado.slice(0, max || 8).map(function (r) { return r.c; });
  }

  /** ¿Llegamos a ese barrio? Devuelve { estado: 'si'|'no'|'consultar'|'', barrio } */
  function clasificarZona(barrio, zonas) {
    var b = normalizarTexto(barrio);
    if (!b) return { estado: '', barrio: '' };
    var lista = zonas || [];
    for (var i = 0; i < lista.length; i++) {
      if (normalizarTexto(lista[i].barrio) === b) {
        var l = normalizarTexto(lista[i].llegamos);
        var estado = esSi(l) ? 'si' : (/^no/.test(l) ? 'no' : (/consult/.test(l) ? 'consultar' : ''));
        return { estado: estado, barrio: texto(lista[i].barrio), notas: texto(lista[i].notas) };
      }
    }
    return { estado: '', barrio: texto(barrio) };
  }

  /** De la dirección de Google Contacts saca la calle (1ra línea) y el barrio si coincide con ZONAS. */
  function separarDireccionContacto(formateada, zonas) {
    var t = texto(formateada);
    if (!t) return { direccion: '', barrio: '' };
    var lineas = t.split(/\n|,/).map(function (s) { return s.trim(); }).filter(Boolean);
    var norm = normalizarTexto(t);
    var barrio = '';
    (zonas || []).slice().sort(function (a, b) { return texto(b.barrio).length - texto(a.barrio).length; })
      .some(function (z) {
        var zb = normalizarTexto(z.barrio);
        if (zb && new RegExp('(^|[^a-z])' + zb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(norm)) {
          barrio = texto(z.barrio);
          return true;
        }
        return false;
      });
    return { direccion: lineas[0] || '', barrio: barrio };
  }

  // ───────────────────────────── Importaciones ─────────────────────────────

  /** Acepta el ID suelto o el link completo de una planilla de Google. */
  function extraerIdPlanilla(valor) {
    var t = texto(valor);
    var m = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(t);
    if (m) return m[1];
    return /^[a-zA-Z0-9_-]{20,}$/.test(t) ? t : '';
  }

  /** Hash corto y estable de un texto (para IDs de importación). */
  function hashTexto(s) {
    var t = String(s);
    var h1 = 0x811c9dc5;
    var h2 = 5381;
    for (var i = 0; i < t.length; i++) {
      var c = t.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 = (Math.imul(h2, 33) + c) >>> 0;
    }
    return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
  }

  function idImportacion(campos, ocurrencia) {
    return 'IMP-' + hashTexto((campos || []).map(normalizarTexto).join('|') + '#' + (ocurrencia || 0)).toUpperCase();
  }

  function nuevoId(prefijo, fechaIso, aleatorio) {
    return texto(prefijo) + texto(fechaIso).replace(/-/g, '') + '-' + texto(aleatorio).toUpperCase();
  }

  /**
   * Prepara los contactos para CLIENTES sin duplicar teléfonos.
   * filas: [{ nombre, telefono, direccion (formateada), notas }]
   * existentes: clientes que ya están ({ telefono, nombre, direccion, barrio, notas }).
   */
  function prepararImportacionClientes(filas, existentes, zonas, caracteristica) {
    var porTelefono = {};
    (existentes || []).forEach(function (c) { if (c.telefono) porTelefono[c.telefono] = c; });
    var nuevos = [];
    var nuevosPorTel = {};
    var actualizar = [];
    var sinTelefono = 0;
    var repetidos = 0;
    (filas || []).forEach(function (f) {
      var tel = primerTelefonoValido(f.telefono, caracteristica);
      if (!tel) { if (texto(f.nombre) || texto(f.telefono)) sinTelefono++; return; }
      var dir = separarDireccionContacto(f.direccion, zonas);
      var datos = { telefono: tel, nombre: texto(f.nombre), direccion: dir.direccion, barrio: dir.barrio, notas: texto(f.notas) };
      var ex = porTelefono[tel];
      if (ex) {
        repetidos++;
        var cambios = {};
        ['nombre', 'direccion', 'barrio', 'notas'].forEach(function (k) { if (!texto(ex[k]) && datos[k]) cambios[k] = datos[k]; });
        if (Object.keys(cambios).length) actualizar.push({ telefono: tel, cambios: cambios });
        return;
      }
      if (nuevosPorTel[tel]) {
        repetidos++;
        ['nombre', 'direccion', 'barrio', 'notas'].forEach(function (k) { if (!nuevosPorTel[tel][k] && datos[k]) nuevosPorTel[tel][k] = datos[k]; });
        return;
      }
      nuevosPorTel[tel] = datos;
      nuevos.push(datos);
    });
    return { nuevos: nuevos, actualizar: actualizar, sinTelefono: sinTelefono, repetidos: repetidos };
  }

  /**
   * Convierte una fila de la pestaña "Ventas" vieja en un pedido entregado.
   * fila: { fecha (aaaa-mm-dd), cliente, zona, producto, detalle, precio, costo, ganancia, medio, nota }
   * ctx: { catalogo, medios, clientesPorNombre: { nombreNormalizado: [telefonos] }, caracteristica, id, ahora }
   */
  function interpretarVentaImportada(fila, ctx) {
    ctx = ctx || {};
    var ext = extraerTelefono(fila.cliente, ctx.caracteristica);
    var nombre = ext.resto || 'Sin nombre';
    var telefono = ext.telefono;
    var notas = [];
    if (texto(fila.nota)) notas.push(texto(fila.nota));
    if (ext.incompleto) notas.push('Teléfono incompleto en la planilla vieja: ' + ext.incompleto);
    if (!telefono && ctx.clientesPorNombre) {
      var candidatos = ctx.clientesPorNombre[normalizarTexto(nombre)] || [];
      if (candidatos.length === 1) {
        telefono = candidatos[0];
        notas.push('Teléfono tomado de CLIENTES por el nombre.');
      }
    }
    var cobrado = parsearPesos(fila.precio) || 0;
    var costo = parsearPesos(fila.costo);
    var ganancia = parsearPesos(fila.ganancia);
    if (costo === null && ganancia !== null) costo = cobrado - ganancia;
    var costoIncompleto = costo === null;
    if (costo === null) costo = 0;

    var lineas = [];
    var textoProducto = texto(fila.producto);
    if (textoProducto) {
      var clave = claveCodigo(textoProducto.replace(/^\s*\d+([.,]\d+)?\s*(x\s*)?/i, ''));
      var item = null;
      ((ctx.catalogo && ctx.catalogo.items) || []).some(function (it) {
        if (claveCodigo(it.codigo) === clave || claveCodigo(it.nombre) === clave) { item = it; return true; }
        return false;
      });
      if (item) {
        var mCant = /^\s*(\d+(?:[.,]\d+)?)/.exec(textoProducto) || /^\s*(\d+(?:[.,]\d+)?)/.exec(texto(fila.detalle));
        var cantidad = (mCant && parsearCantidad(mCant[1])) || 1;
        lineas.push({
          pedido: ctx.id,
          codigo: item.codigo,
          cantidad: cantidad,
          precioUnitario: redondear(cobrado / cantidad),
          costoUnitario: redondear(costo / cantidad),
          descripcion: item.nombre
        });
      }
    }
    var pedido = {
      id: ctx.id,
      fechaCarga: fila.fecha,
      fechaEntrega: fila.fecha,
      vuelta: '',
      orden: '',
      telefono: telefono,
      cliente: nombre,
      direccion: '',
      entreCalles: '',
      barrio: texto(fila.zona),
      referencia: '',
      horario: '',
      totalSugerido: cobrado,
      totalCobrado: cobrado,
      envio: 0,
      costo: costo,
      ganancia: cobrado - costo,
      origen: '',
      estado: ESTADOS.ENTREGADO,
      medio: normalizarMedio(fila.medio, ctx.medios),
      notas: notas.join(' · '),
      detalle: [textoProducto, texto(fila.detalle)].filter(Boolean).join(' — '),
      costoIncompleto: costoIncompleto,
      actualizado: texto(ctx.ahora)
    };
    return { pedido: pedido, lineas: lineas };
  }

  return {
    ZONA_HORARIA: ZONA_HORARIA,
    ESTADOS: ESTADOS,
    LISTA_ESTADOS: LISTA_ESTADOS,
    VUELTAS: VUELTAS,
    LISTA_VUELTAS: LISTA_VUELTAS,
    CLAVES_CONFIG: CLAVES_CONFIG,
    texto: texto,
    normalizarTexto: normalizarTexto,
    normalizarCodigo: normalizarCodigo,
    claveCodigo: claveCodigo,
    esSi: esSi,
    parsearLista: parsearLista,
    acortar: acortar,
    redondear: redondear,
    multiplicarPesos: multiplicarPesos,
    parsearMonto: parsearMonto,
    parsearPesos: parsearPesos,
    parsearCantidad: parsearCantidad,
    parsearPorcentaje: parsearPorcentaje,
    formatearPesos: formatearPesos,
    formatearCantidad: formatearCantidad,
    formatearPorcentaje: formatearPorcentaje,
    margen: margen,
    repartir: repartir,
    normalizarTelefono: normalizarTelefono,
    telefonoValido: telefonoValido,
    primerTelefonoValido: primerTelefonoValido,
    extraerTelefono: extraerTelefono,
    formatearTelefono: formatearTelefono,
    primerNombre: primerNombre,
    completarMensaje: completarMensaje,
    linkWhatsapp: linkWhatsapp,
    isoDesdePartes: isoDesdePartes,
    esFechaISO: esFechaISO,
    sumarDias: sumarDias,
    diaDeSemana: diaDeSemana,
    esDiaDeReparto: esDiaDeReparto,
    siguienteDiaDeReparto: siguienteDiaDeReparto,
    minutosDeHora: minutosDeHora,
    fechaEntregaPorDefecto: fechaEntregaPorDefecto,
    parsearFecha: parsearFecha,
    formatearFecha: formatearFecha,
    formatearFechaCorta: formatearFechaCorta,
    formatearFechaLarga: formatearFechaLarga,
    fechaRelativa: fechaRelativa,
    partesFechaEnZona: partesFechaEnZona,
    interpretarConfig: interpretarConfig,
    unidadParaMostrar: unidadParaMostrar,
    armarCatalogo: armarCatalogo,
    calcularPedido: calcularPedido,
    detalleLineas: detalleLineas,
    calcularAvisos: calcularAvisos,
    normalizarEstado: normalizarEstado,
    normalizarVuelta: normalizarVuelta,
    esEstadoFinal: esEstadoFinal,
    direccionCompleta: direccionCompleta,
    direccionParaMapa: direccionParaMapa,
    linkMapsBusqueda: linkMapsBusqueda,
    armarLinksRuta: armarLinksRuta,
    vueltaParaPedido: vueltaParaPedido,
    ordenesPorFecha: ordenesPorFecha,
    aCobrar: aCobrar,
    prepararPedido: prepararPedido,
    aplicarCambiosPedido: aplicarCambiosPedido,
    motivoPendiente: motivoPendiente,
    ordenarParaHoy: ordenarParaHoy,
    aplicarOrdenOptimizado: aplicarOrdenOptimizado,
    nuevaSecuencia: nuevaSecuencia,
    nombreVuelta: nombreVuelta,
    entraEnVuelta: entraEnVuelta,
    cargaPorCategoria: cargaPorCategoria,
    unidadesPorCategoria: unidadesPorCategoria,
    etiquetaCorta: etiquetaCorta,
    normalizarMedio: normalizarMedio,
    cierreDelDia: cierreDelDia,
    datosHojaReparto: datosHojaReparto,
    estadisticasCliente: estadisticasCliente,
    cambiosCliente: cambiosCliente,
    buscarClientes: buscarClientes,
    clasificarZona: clasificarZona,
    separarDireccionContacto: separarDireccionContacto,
    extraerIdPlanilla: extraerIdPlanilla,
    hashTexto: hashTexto,
    idImportacion: idImportacion,
    nuevoId: nuevoId,
    prepararImportacionClientes: prepararImportacionClientes,
    interpretarVentaImportada: interpretarVentaImportada
  };
}

var Logica = crearLogica_();

if (typeof module !== 'undefined') module.exports = { Logica: Logica, crearLogica_: crearLogica_ };
