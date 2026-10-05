'use strict';
/**
 * Chequeos que corre "npm run verificar" antes de los tests:
 *   1. Sintaxis de todos los .gs y del JavaScript de los .html (incluidas las plantillas).
 *   2. Nada que Apps Script no entienda (?. y ??).
 *   3. Que cada función que llama la web app exista en Codigo.gs y no sea privada (_).
 *   4. Máximo 4 archivos en apps-script/.
 *   5. Que no haya IDs de planillas, links de la web app ni teléfonos que parezcan reales.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var plantillas = require('./apoyo/plantillas');
var Logica = require('../apps-script/Logica.gs').Logica;

var RAIZ = path.join(__dirname, '..');
var DIR = path.join(RAIZ, 'apps-script');
var errores = [];
var ok = [];

function error(msg) { errores.push(msg); }

function sintaxis(codigo, nombre) {
  try {
    new vm.Script(codigo, { filename: nombre });
    return true;
  } catch (e) {
    error(nombre + ': error de sintaxis: ' + e.message);
    return false;
  }
}

/** Saca strings, comentarios y regex (aproximado) para buscar construcciones prohibidas. */
function sinTextos(codigo) {
  var salida = '';
  var i = 0;
  var n = codigo.length;
  var previoSignificativo = '';
  while (i < n) {
    var c = codigo[i];
    var d = codigo[i + 1];
    if (c === '/' && d === '/') { while (i < n && codigo[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i = codigo.indexOf('*/', i + 2); i = i < 0 ? n : i + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      var q = c;
      i++;
      while (i < n && codigo[i] !== q) { if (codigo[i] === '\\') i++; i++; }
      i++;
      salida += '""';
      previoSignificativo = '"';
      continue;
    }
    if (c === '/' && /[(,=:[!&|?{};]|^$/.test(previoSignificativo)) {
      i++;
      var enClase = false;
      while (i < n && (codigo[i] !== '/' || enClase)) {
        if (codigo[i] === '\\') i++;
        else if (codigo[i] === '[') enClase = true;
        else if (codigo[i] === ']') enClase = false;
        i++;
      }
      i++;
      while (i < n && /[a-z]/i.test(codigo[i])) i++;
      salida += '/r/';
      previoSignificativo = '/';
      continue;
    }
    salida += c;
    if (!/\s/.test(c)) previoSignificativo = c;
    i++;
  }
  return salida;
}

function sinConstruccionesNuevas(codigo, nombre) {
  var limpio = sinTextos(codigo);
  if (/\?\.(?!\d)/.test(limpio)) error(nombre + ': usa "?." (Apps Script puede no soportarlo).');
  if (/\?\?/.test(limpio)) error(nombre + ': usa "??" (Apps Script puede no soportarlo).');
  if (/\|\|=|&&=/.test(limpio)) error(nombre + ': usa "||=" o "&&=" (Apps Script puede no soportarlo).');
}

// 1, 2 — archivos de apps-script
var archivos = fs.readdirSync(DIR).filter(function (f) { return !f.startsWith('.'); });
if (archivos.length > 4) error('apps-script/ tiene ' + archivos.length + ' archivos (máximo 4): ' + archivos.join(', '));
else ok.push('apps-script/ tiene ' + archivos.length + ' archivos: ' + archivos.join(', '));

archivos.forEach(function (archivo) {
  var ruta = path.join(DIR, archivo);
  var codigo = fs.readFileSync(ruta, 'utf8');
  if (archivo.endsWith('.gs')) {
    if (sintaxis(codigo, archivo)) ok.push('Sintaxis OK: ' + archivo);
    sinConstruccionesNuevas(codigo, archivo);
  } else if (archivo.endsWith('.html')) {
    var cuerpo = plantillas.compilarPlantilla(codigo);
    if (sintaxis('(function (__esc) {\n' + cuerpo + '\n})', archivo + ' (plantilla)')) ok.push('Sintaxis OK: ' + archivo + ' (plantilla)');
    plantillas.scriptsDeHtml(codigo).forEach(function (js, i) {
      var nombre = archivo + ' <script> #' + (i + 1);
      if (sintaxis(js, nombre)) ok.push('Sintaxis OK: ' + nombre);
      sinConstruccionesNuevas(js, nombre);
    });
  }
});

// El código de Logica tiene que poder viajar solo a la web app (sin depender de nada de afuera).
var crearLogica = require('../apps-script/Logica.gs').crearLogica_;
try {
  var copia = vm.runInNewContext('(' + crearLogica.toString() + ')()', {});
  if (typeof copia.calcularPedido !== 'function') throw new Error('no devolvió las funciones');
  ok.push('Logica.gs se puede mandar entera a la web app.');
} catch (e) {
  error('Logica.gs no se puede usar sola en la web app: ' + e.message);
}

// 3 — funciones que llama la web app
var codigoGs = fs.readFileSync(path.join(DIR, 'Codigo.gs'), 'utf8');
var app = fs.readFileSync(path.join(DIR, 'App.html'), 'utf8');
var publicas = {};
codigoGs.replace(/^function ([A-Za-z0-9_]+)\s*\(/gm, function (t, n) { publicas[n] = true; return t; });
var llamadas = {};
app.replace(/\b(?:accion|encolar)\('([A-Za-z0-9_]+)'/g, function (t, n) { llamadas[n] = true; return t; });

/** Sigue cada "google.script.run" y anota el método final de la cadena (salteando los handlers). */
function llamadasDirectas(codigo) {
  var limpio = sinTextos(codigo);
  var re = /google\.script\.run/g;
  var m;
  while ((m = re.exec(limpio))) {
    var i = m.index + m[0].length;
    var final = null;
    for (;;) {
      var resto = limpio.slice(i);
      var paso = /^\s*\.\s*([A-Za-z0-9_]+)\s*/.exec(resto);
      if (!paso) break;
      i += paso[0].length;
      if (limpio[i] !== '(') { final = null; break; }
      var profundidad = 0;
      do {
        if (limpio[i] === '(') profundidad++;
        else if (limpio[i] === ')') profundidad--;
        i++;
      } while (profundidad > 0 && i < limpio.length);
      if (!/^with(Success|Failure)Handler$|^withUserObject$/.test(paso[1])) final = paso[1];
    }
    if (final) llamadas[final] = true;
  }
}
llamadasDirectas(app);
llamadasDirectas(codigoGs);
Object.keys(llamadas).forEach(function (n) {
  if (!publicas[n]) error('La web app llama a "' + n + '" pero no existe en Codigo.gs.');
  else if (/_$/.test(n)) error('La web app llama a "' + n + '", que es privada (termina en _).');
});
// Lo que llama el menú también tiene que existir.
codigoGs.replace(/\.addItem\('[^']*',\s*'([A-Za-z0-9_]+)'\)/g, function (t, n) {
  if (!publicas[n]) error('El menú llama a "' + n + '" pero no existe.');
  return t;
});
ok.push('Funciones llamadas por la web app: ' + Object.keys(llamadas).sort().join(', '));

// 5 — datos sensibles en todo el repo
function listar(dir) {
  var salida = [];
  fs.readdirSync(dir).forEach(function (f) {
    if (f === '.git' || f === 'node_modules') return;
    var ruta = path.join(dir, f);
    if (fs.statSync(ruta).isDirectory()) salida = salida.concat(listar(ruta));
    else if (/\.(gs|html|js|json|md|txt)$/i.test(f)) salida.push(ruta);
  });
  return salida;
}
// Teléfonos de ejemplo permitidos: característica + 555…, 0000… o 1234-5678.
var TELEFONO_DE_EJEMPLO = /^\d{2,4}(555\d{3,5}|0000\d{2,4}|12345678)$/;
// Un ID de Google real tiene mayúsculas, minúsculas y números mezclados.
function pareceIdReal(x) { return x.length >= 25 && /[a-z]/.test(x) && /[A-Z]/.test(x) && /\d/.test(x); }
listar(RAIZ).forEach(function (ruta) {
  var rel = path.relative(RAIZ, ruta);
  var texto = fs.readFileSync(ruta, 'utf8');
  (texto.match(/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]+)/g) || []).forEach(function (x) {
    if (pareceIdReal(x.split('/d/')[1])) error(rel + ': tiene un link a una planilla de Google.');
  });
  if (/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}/.test(texto)) error(rel + ': tiene un link de web app.');
  (texto.match(/\b[A-Za-z0-9_-]{25,}\b/g) || []).forEach(function (x) {
    if (pareceIdReal(x)) error(rel + ': tiene algo que parece un ID: ' + x.slice(0, 12) + '…');
  });
  var numeros = texto.match(/\+?\d[\d\s\-().]{7,}\d/g) || [];
  numeros.forEach(function (x) {
    if (/\d{4}-\d{2}-\d{2}/.test(x)) return; // fechas, no teléfonos
    if (/\d\s[-+*\/]\s\d/.test(x)) return; // cuentas ("15000 - 11550"), no teléfonos
    var tel = Logica.normalizarTelefono(x, '11');
    if (tel && !TELEFONO_DE_EJEMPLO.test(tel.slice(4))) error(rel + ': tiene un teléfono que podría ser real: ' + x.trim());
  });
});
ok.push('Sin IDs de planillas, links de web app ni teléfonos reales.');

ok.forEach(function (m) { console.log('✅ ' + m); });
if (errores.length) {
  errores.forEach(function (m) { console.error('❌ ' + m); });
  process.exit(1);
}
console.log('\nChequeos OK. Ahora los tests…\n');
