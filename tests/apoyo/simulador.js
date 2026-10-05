'use strict';
/**
 * Simulador de Google Apps Script para probar Codigo.gs en Node.
 * Imita lo justo de SpreadsheetApp, HtmlService, DriveApp, Maps, etc.
 * Como Sheets de verdad:
 *   - setValues exige que las medidas coincidan y no deja escribir fuera de la grilla;
 *   - el texto que parece número o fecha se convierte, salvo que la celda tenga formato "@"
 *     (así se detecta si un teléfono "+549…" quedaría guardado como número).
 * Todos los datos que usan los tests son inventados.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var plantillas = require('./plantillas');

var RAIZ = path.join(__dirname, '..', '..');
var TZ = 'America/Argentina/Buenos_Aires';

function formatearFecha(fecha, zona, patron) {
  var f = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  var p = {};
  f.formatToParts(fecha).forEach(function (x) { p[x.type] = x.value; });
  var mapa = { yyyy: p.year, MM: p.month, dd: p.day, HH: p.hour === '24' ? '00' : p.hour, mm: p.minute, ss: p.second };
  return patron.replace(/yyyy|MM|dd|HH|mm|ss/g, function (t) { return mapa[t]; });
}

/** El instante que en la zona dada se ve como esa fecha y hora. */
function instanteEnZona(a, m, d, hh, mi, ss, zona) {
  var objetivo = Date.UTC(a, m - 1, d, hh, mi, ss);
  var t = objetivo;
  for (var i = 0; i < 4; i++) {
    var s = formatearFecha(new Date(t), zona, 'yyyy-MM-dd HH:mm:ss');
    var x = /^(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)$/.exec(s);
    var visto = Date.UTC(+x[1], +x[2] - 1, +x[3], +x[4], +x[5], +x[6]);
    if (visto === objetivo) break;
    t += objetivo - visto;
  }
  return new Date(t);
}

function esFecha(v) { return Object.prototype.toString.call(v) === '[object Date]'; }

/** Lo que hace Sheets con un valor escrito desde Apps Script. */
function interpretar(v, formato, zona) {
  if (v === undefined || typeof v === 'function' || (v !== null && typeof v === 'object' && !esFecha(v))) {
    throw new Error('Valor inválido para una celda: ' + String(v));
  }
  if (v === null) return '';
  if (typeof v !== 'string') return v;
  if (formato === '@' || v === '') return v;
  if (/^[+-]?\d+(\.\d+)?$/.test(v)) return Number(v);
  var m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(v);
  if (m) return instanteEnZona(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0), zona);
  m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (m) return instanteEnZona(1899, 12, 30, +m[1], +m[2], 0, zona);
  if (/^\d+(\.\d+)?%$/.test(v)) return Number(v.slice(0, -1)) / 100;
  return v;
}

function mostrar(v, zona) {
  if (v === '' || v === null || v === undefined) return '';
  if (esFecha(v)) {
    if (v.getUTCFullYear() < 1900) return formatearFecha(v, zona, 'HH:mm');
    return formatearFecha(v, zona, 'dd/MM/yyyy');
  }
  return String(v);
}

function Rango(hoja, fila, col, nf, nc) {
  this.hoja = hoja; this.fila = fila; this.col = col; this.nf = nf; this.nc = nc;
}
Rango.prototype.recorrer = function (fn) {
  for (var r = 0; r < this.nf; r++) for (var c = 0; c < this.nc; c++) fn(this.fila + r, this.col + c, r, c);
};
Rango.prototype.getValues = function () {
  var h = this.hoja;
  var salida = [];
  for (var r = 0; r < this.nf; r++) {
    var fila = [];
    for (var c = 0; c < this.nc; c++) {
      var v = h.leer(this.fila + r, this.col + c);
      fila.push(esFecha(v) ? new Date(v.getTime()) : v);
    }
    salida.push(fila);
  }
  return salida;
};
Rango.prototype.getDisplayValues = function () {
  var zona = this.hoja.planilla.zona;
  return this.getValues().map(function (f) { return f.map(function (v) { return mostrar(v, zona); }); });
};
Rango.prototype.getValue = function () { return this.getValues()[0][0]; };
Rango.prototype.medidas_ = function (datos, que) {
  if (!Array.isArray(datos) || datos.length !== this.nf) {
    throw new Error('The number of rows in the ' + que + ' does not match the number of rows in the range. The data has ' +
      (Array.isArray(datos) ? datos.length : '?') + ' but the range has ' + this.nf + '.');
  }
  for (var i = 0; i < datos.length; i++) {
    if (!Array.isArray(datos[i]) || datos[i].length !== this.nc) {
      throw new Error('The number of columns in the ' + que + ' does not match the number of columns in the range. The data has ' +
        (Array.isArray(datos[i]) ? datos[i].length : '?') + ' but the range has ' + this.nc + '.');
    }
  }
};
Rango.prototype.setValues = function (datos) {
  this.medidas_(datos, 'data');
  var h = this.hoja;
  var zona = h.planilla.zona;
  this.recorrer(function (f, c, r, k) { h.escribir(f, c, interpretar(datos[r][k], h.formato(f, c), zona)); });
  return this;
};
Rango.prototype.setValue = function (v) {
  var h = this.hoja;
  var zona = h.planilla.zona;
  this.recorrer(function (f, c) { h.escribir(f, c, interpretar(v, h.formato(f, c), zona)); });
  return this;
};
Rango.prototype.setNumberFormat = function (formato) {
  var h = this.hoja;
  this.recorrer(function (f, c) { h.ponerFormato(f, c, formato); });
  return this;
};
Rango.prototype.setNumberFormats = function (formatos) {
  this.medidas_(formatos, 'formats');
  var h = this.hoja;
  this.recorrer(function (f, c, r, k) { h.ponerFormato(f, c, formatos[r][k]); });
  return this;
};
Rango.prototype.getNumberFormat = function () { return this.hoja.formato(this.fila, this.col); };
Rango.prototype.clearContent = function () {
  var h = this.hoja;
  this.recorrer(function (f, c) { h.escribir(f, c, ''); delete h.links[f + ',' + c]; });
  return this;
};
Rango.prototype.setDataValidation = function (regla) {
  var h = this.hoja;
  this.recorrer(function (f, c) { h.validaciones[f + ',' + c] = regla; });
  return this;
};
Rango.prototype.clearDataValidations = function () {
  var h = this.hoja;
  this.recorrer(function (f, c) { delete h.validaciones[f + ',' + c]; });
  return this;
};
Rango.prototype.getSheet = function () { return this.hoja; };
Rango.prototype.getRow = function () { return this.fila; };
Rango.prototype.getColumn = function () { return this.col; };
Rango.prototype.getNumRows = function () { return this.nf; };
Rango.prototype.getNumColumns = function () { return this.nc; };
/** Como Sheets: el texto de la celda pasa a ser el del texto enriquecido y el link queda guardado aparte. */
Rango.prototype.setRichTextValues = function (valores) {
  this.medidas_(valores, 'rich text values');
  var h = this.hoja;
  this.recorrer(function (f, c, r, k) {
    var rt = valores[r][k];
    if (!rt || typeof rt.getText !== 'function') throw new Error('setRichTextValues necesita RichTextValue.');
    h.escribir(f, c, rt.getText());
    h.links[f + ',' + c] = rt.getLinkUrl();
  });
  return this;
};
Rango.prototype.getRichTextValues = function () {
  var h = this.hoja;
  var salida = [];
  for (var r = 0; r < this.nf; r++) {
    var fila = [];
    for (var c = 0; c < this.nc; c++) {
      var k = (this.fila + r) + ',' + (this.col + c);
      fila.push({ texto: String(h.leer(this.fila + r, this.col + c)), link: h.links[k] || null });
    }
    salida.push(fila);
  }
  return salida;
};
['setFontWeight', 'setBackground', 'setFontColor', 'setWrap', 'setHorizontalAlignment', 'setFontSize'].forEach(function (m) {
  Rango.prototype[m] = function () { return this; };
});

function Hoja(planilla, nombre) {
  this.planilla = planilla;
  this.nombre = nombre;
  this.celdas = [];
  this.formatos = [];
  this.maxFilas = 1000;
  this.maxCols = 26;
  this.congeladas = 0;
  this.columnasCongeladas = 0;
  this.validaciones = {};
  this.links = {};
}
Hoja.prototype.getName = function () { return this.nombre; };
Hoja.prototype.leer = function (f, c) { var x = this.celdas[f - 1]; return x && x[c - 1] !== undefined ? x[c - 1] : ''; };
Hoja.prototype.escribir = function (f, c, v) {
  if (!this.celdas[f - 1]) this.celdas[f - 1] = [];
  this.celdas[f - 1][c - 1] = v;
};
Hoja.prototype.formato = function (f, c) { var x = this.formatos[f - 1]; return x && x[c - 1] ? x[c - 1] : ''; };
Hoja.prototype.ponerFormato = function (f, c, v) {
  if (!this.formatos[f - 1]) this.formatos[f - 1] = [];
  this.formatos[f - 1][c - 1] = v;
};
Hoja.prototype.getMaxRows = function () { return this.maxFilas; };
Hoja.prototype.getMaxColumns = function () { return this.maxCols; };
Hoja.prototype.getLastRow = function () {
  for (var r = this.celdas.length; r >= 1; r--) {
    var fila = this.celdas[r - 1];
    if (fila && fila.some(function (v) { return v !== '' && v !== undefined && v !== null; })) return r;
  }
  return 0;
};
Hoja.prototype.getLastColumn = function () {
  var max = 0;
  this.celdas.forEach(function (fila) {
    if (!fila) return;
    for (var c = fila.length; c >= 1; c--) {
      if (fila[c - 1] !== '' && fila[c - 1] !== undefined && fila[c - 1] !== null) { max = Math.max(max, c); break; }
    }
  });
  return max;
};
Hoja.prototype.getRange = function (fila, col, nf, nc) {
  if (typeof fila !== 'number') throw new Error('El simulador solo acepta getRange con números.');
  nf = nf === undefined ? 1 : nf;
  nc = nc === undefined ? 1 : nc;
  if (fila < 1 || col < 1 || nf < 1 || nc < 1) throw new Error('The number of rows/columns in the range must be at least 1.');
  if (fila + nf - 1 > this.maxFilas || col + nc - 1 > this.maxCols) {
    throw new Error('The coordinates of the range are outside the dimensions of the sheet (' + this.nombre + ').');
  }
  return new Rango(this, fila, col, nf, nc);
};
Hoja.prototype.getDataRange = function () {
  return this.getRange(1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1));
};
Hoja.prototype.insertRowsAfter = function (despues, n) {
  if (despues < 1 || despues > this.maxFilas) throw new Error('Those rows are out of bounds.');
  var formatoArriba = (this.formatos[despues - 1] || []).slice();
  var nuevasCeldas = [];
  var nuevosFormatos = [];
  for (var i = 0; i < n; i++) { nuevasCeldas.push([]); nuevosFormatos.push(formatoArriba.slice()); }
  this.celdas.splice.apply(this.celdas, [despues, 0].concat(nuevasCeldas));
  this.formatos.splice.apply(this.formatos, [despues, 0].concat(nuevosFormatos));
  this.correrFilas_(despues + 1, n);
  this.maxFilas += n;
  return this;
};
Hoja.prototype.insertColumnsAfter = function (despues, n) {
  this.maxCols += n;
  return this;
};
/** Corre las claves "fila,columna" de links y validaciones cuando se insertan o borran filas. */
Hoja.prototype.correrFilas_ = function (desde, delta) {
  var self = this;
  ['links', 'validaciones'].forEach(function (mapa) {
    var nuevo = {};
    Object.keys(self[mapa]).forEach(function (k) {
      var p = k.split(',').map(Number);
      if (delta < 0 && p[0] >= desde && p[0] < desde - delta) return;
      nuevo[(p[0] >= desde ? p[0] + delta : p[0]) + ',' + p[1]] = self[mapa][k];
    });
    self[mapa] = nuevo;
  });
};
Hoja.prototype.deleteRows = function (desde, n) {
  if (desde < 1 || desde + n - 1 > this.maxFilas) throw new Error('Those rows are out of bounds.');
  if (n >= this.maxFilas) throw new Error('You can\'t delete all the rows on the sheet.');
  this.celdas.splice(desde - 1, n);
  this.formatos.splice(desde - 1, n);
  this.correrFilas_(desde, -n);
  this.maxFilas -= n;
  return this;
};
Hoja.prototype.deleteRow = function (fila) { return this.deleteRows(fila, 1); };
Hoja.prototype.setFrozenRows = function (n) { this.congeladas = n; return this; };
Hoja.prototype.setFrozenColumns = function (n) { this.columnasCongeladas = n; return this; };
Hoja.prototype.setColumnWidth = function () { return this; };
Hoja.prototype.clear = function () { this.celdas = []; this.formatos = []; this.links = {}; this.validaciones = {}; return this; };
/** Para los tests: toda la hoja como matriz (sin filas vacías del final). */
Hoja.prototype.matriz = function () {
  var filas = this.getLastRow();
  var cols = this.getLastColumn();
  return filas && cols ? this.getRange(1, 1, filas, cols).getValues() : [];
};

function Planilla(nombre, id) {
  this.nombre = nombre;
  this.id = id || 'planilla-de-prueba';
  this.hojas = [];
  this.zona = TZ;
}
Planilla.prototype.getName = function () { return this.nombre; };
Planilla.prototype.getId = function () { return this.id; };
Planilla.prototype.getSheets = function () { return this.hojas.slice(); };
Planilla.prototype.getSheetByName = function (n) {
  return this.hojas.filter(function (h) { return h.nombre === n; })[0] || null;
};
Planilla.prototype.insertSheet = function (nombre, indice) {
  if (this.getSheetByName(nombre)) throw new Error('Ya existe una hoja con el nombre "' + nombre + '".');
  var h = new Hoja(this, nombre);
  if (indice === undefined || indice >= this.hojas.length) this.hojas.push(h); else this.hojas.splice(indice, 0, h);
  return h;
};
Planilla.prototype.getSpreadsheetTimeZone = function () { return this.zona; };
Planilla.prototype.setSpreadsheetTimeZone = function (z) { this.zona = z; };
Planilla.prototype.toast = function () {};
/** Para los tests: crea una hoja con datos (los valores se guardan tal cual). */
Planilla.prototype.cargarHoja = function (nombre, filas) {
  var h = this.insertSheet(nombre);
  filas.forEach(function (fila, r) { fila.forEach(function (v, c) { h.escribir(r + 1, c + 1, v); }); });
  return h;
};

function iterador(lista) {
  var i = 0;
  return { hasNext: function () { return i < lista.length; }, next: function () { return lista[i++]; } };
}

function crearEntorno(opciones) {
  opciones = opciones || {};
  var planilla = new Planilla('AVÍCOLA BELGRANO (planilla de prueba)');
  var otras = {};
  var propiedades = {};
  var cache = {};
  var carpetas = [];
  var registro = { alertas: [], dialogos: [], menu: [], toasts: [], geocodificadas: [], paradas: [], activadores: [] };
  var ahora = opciones.ahora || null;

  var maps = {
    DirectionFinder: { Mode: { DRIVING: 'driving' } },
    newGeocoder: function () {
      var g = {
        setRegion: function () { return g; },
        setLanguage: function () { return g; },
        setBounds: function () { return g; },
        geocode: function (dir) {
          registro.geocodificadas.push(dir);
          var noEncontrada = (opciones.noEncontradas || []).some(function (x) { return dir.indexOf(x) >= 0; });
          if (noEncontrada) return { status: 'ZERO_RESULTS', results: [] };
          var n = 0;
          for (var i = 0; i < dir.length; i++) n = (n * 31 + dir.charCodeAt(i)) % 100000;
          return { status: 'OK', results: [{ geometry: { location: { lat: -34.7 - n / 1e7, lng: -58.2 - n / 1e7 }, location_type: 'ROOFTOP' } }] };
        }
      };
      return g;
    },
    newDirectionFinder: function () {
      var paradas = [];
      var d = {
        setOrigin: function () { return d; }, setDestination: function () { return d; }, setMode: function () { return d; },
        setOptimizeWaypoints: function () { return d; }, setLanguage: function () { return d; }, setRegion: function () { return d; },
        addWaypoint: function (w) { paradas.push(w); return d; },
        getDirections: function () {
          registro.paradas.push(paradas.slice());
          // Ruta "optimizada" de mentira: el orden inverso.
          return { status: 'OK', routes: [{ waypoint_order: paradas.map(function (x, i) { return i; }).reverse() }] };
        }
      };
      return d;
    }
  };

  function crearCarpeta(nombre) {
    var archivos = [];
    var carpeta = {
      nombre: nombre,
      archivos: archivos,
      getName: function () { return nombre; },
      createFile: function (blob) {
        var archivo = {
          nombre: blob.getName(), blob: blob, borrado: false,
          url: 'https://drive.example/archivo/' + (archivos.length + 1),
          getUrl: function () { return archivo.url; },
          getName: function () { return archivo.nombre; },
          setTrashed: function (v) { archivo.borrado = v; return archivo; }
        };
        archivos.push(archivo);
        return archivo;
      },
      getFilesByName: function (n) { return iterador(archivos.filter(function (a) { return a.nombre === n && !a.borrado; })); }
    };
    carpetas.push(carpeta);
    return carpeta;
  }

  function blob(contenido, tipo, nombre) {
    var b = {
      contenido: contenido, tipo: tipo, nombre: nombre,
      getAs: function (t) { return blobNuevo(contenido, t, nombre); },
      setName: function (n) { b.nombre = n; return b; },
      getName: function () { return b.nombre; },
      getDataAsString: function () { return contenido; }
    };
    return b;
  }
  function blobNuevo(c, t, n) { return blob(c, t, n); }

  var ui = {
    ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO' },
    Button: { OK: 'OK', CANCEL: 'CANCEL', YES: 'YES', NO: 'NO' },
    createMenu: function (nombre) {
      var m = {
        addItem: function (texto, fn) { registro.menu.push([texto, fn]); return m; },
        addSeparator: function () { return m; },
        addToUi: function () { return m; }
      };
      registro.menu.push(['__menu__', nombre]);
      return m;
    },
    alert: function (msg) { registro.alertas.push(msg); return 'YES'; },
    prompt: function () { return { getSelectedButton: function () { return 'OK'; }, getResponseText: function () { return opciones.respuestaPrompt || ''; } }; },
    showModalDialog: function (html, titulo) { registro.dialogos.push([titulo, html.getContent()]); }
  };

  var contexto = {
    console: { log: function () {}, error: function () {}, warn: function () {} },
    SpreadsheetApp: {
      getActiveSpreadsheet: function () { return planilla; },
      getActive: function () { return planilla; },
      openById: function (id) {
        if (!otras[id]) throw new Error('No existe la planilla ' + id);
        return otras[id];
      },
      flush: function () {},
      getUi: function () { return ui; },
      newRichTextValue: function () {
        var texto = '';
        var link = null;
        var b = {
          setText: function (t) { texto = String(t); return b; },
          setLinkUrl: function (u) { link = u; return b; },
          build: function () { return { getText: function () { return texto; }, getLinkUrl: function () { return link; } }; }
        };
        return b;
      },
      newDataValidation: function () {
        var regla = { lista: null, casilla: false };
        var b = {
          requireValueInList: function (l) { regla.lista = l; return b; },
          requireCheckbox: function () { regla.casilla = true; return b; },
          setAllowInvalid: function () { return b; },
          build: function () { return regla; }
        };
        return b;
      }
    },
    Utilities: {
      formatDate: formatearFecha,
      newBlob: blob
    },
    HtmlService: {
      createTemplateFromFile: function (nombre) {
        var fuente = fs.readFileSync(path.join(RAIZ, 'apps-script', nombre + '.html'), 'utf8');
        var cuerpo = plantillas.compilarPlantilla(fuente);
        var plantilla = {
          evaluate: function () {
            var fn = vm.runInContext('(function (__vars, __esc) { with (__vars) {\n' + cuerpo + '\n} })', contexto);
            return htmlSalida(fn(plantilla, plantillas.escaparHtml));
          }
        };
        return plantilla;
      },
      createHtmlOutput: function (html) { return htmlSalida(html); }
    },
    DriveApp: {
      getFoldersByName: function (n) { return iterador(carpetas.filter(function (c) { return c.nombre === n; })); },
      createFolder: crearCarpeta
    },
    PropertiesService: {
      getDocumentProperties: function () {
        return {
          getProperties: function () { return Object.assign({}, propiedades); },
          getProperty: function (k) { return propiedades[k] === undefined ? null : propiedades[k]; },
          setProperty: function (k, v) { propiedades[k] = String(v); return this; },
          deleteProperty: function (k) { delete propiedades[k]; return this; }
        };
      }
    },
    CacheService: {
      getScriptCache: function () {
        return { get: function (k) { return cache[k] === undefined ? null : cache[k]; }, put: function (k, v) { cache[k] = v; } };
      }
    },
    LockService: {
      getScriptLock: function () { return { waitLock: function () {}, tryLock: function () { return true; }, releaseLock: function () {} }; }
    },
    Maps: maps,
    ScriptApp: {
      getService: function () { return { getUrl: function () { return opciones.urlWebApp || ''; } }; },
      getProjectTriggers: function () { return registro.activadores.slice(); },
      deleteTrigger: function (t) { registro.activadores = registro.activadores.filter(function (x) { return x !== t; }); },
      newTrigger: function (funcion) {
        var datos = { funcion: funcion, cadaDias: null, hora: null, zona: null };
        var tiempo = {
          everyDays: function (n) { datos.cadaDias = n; return tiempo; },
          atHour: function (h) {
            if (h < 0 || h > 23 || Math.floor(h) !== h) throw new Error('La hora tiene que ser un entero de 0 a 23.');
            datos.hora = h;
            return tiempo;
          },
          inTimezone: function (z) { datos.zona = z; return tiempo; },
          create: function () {
            var t = { datos: datos, getHandlerFunction: function () { return funcion; } };
            registro.activadores.push(t);
            return t;
          }
        };
        return { timeBased: function () { return tiempo; } };
      }
    },
    Session: { getScriptTimeZone: function () { return opciones.zonaScript || TZ; } }
  };

  function htmlSalida(html) {
    var salida = {
      contenido: html, titulo: '', metas: [],
      getContent: function () { return salida.contenido; },
      setTitle: function (t) { salida.titulo = t; return salida; },
      addMetaTag: function (n, v) { salida.metas.push([n, v]); return salida; },
      setWidth: function () { return salida; },
      setHeight: function () { return salida; },
      setXFrameOptionsMode: function () { return salida; }
    };
    return salida;
  }

  vm.createContext(contexto);
  if (ahora) {
    // Reloj fijo para que los tests no dependan del día en que se corren.
    vm.runInContext('(function(){ var Real = Date; var fijo = ' + ahora.getTime() + ';' +
      'function D(a,b,c,d,e,f,g){ if (!(this instanceof D)) return new Real(fijo).toString();' +
      ' if (arguments.length === 0) return new Real(fijo); return new (Function.prototype.bind.apply(Real, [null].concat([].slice.call(arguments))))(); }' +
      'D.prototype = Real.prototype; D.now = function(){ return fijo; }; D.UTC = Real.UTC; D.parse = Real.parse; Date = D;' +
      ' this.__moverReloj = function (t) { fijo = t; }; })();', contexto);
  }
  ['Logica.gs', 'Codigo.gs'].forEach(function (archivo) {
    var codigo = fs.readFileSync(path.join(RAIZ, 'apps-script', archivo), 'utf8');
    vm.runInContext(codigo, contexto, { filename: archivo });
  });

  return {
    g: contexto,
    planilla: planilla,
    registro: registro,
    propiedades: propiedades,
    carpetas: carpetas,
    /** Mueve el reloj fijo (solo si se creó con "ahora"). */
    moverReloj: function (fecha) { contexto.__moverReloj(fecha.getTime()); },
    /** Agrega otra planilla para openById (importaciones). */
    otraPlanilla: function (id, nombre) {
      var p = new Planilla(nombre || 'otra', id);
      otras[id] = p;
      return p;
    }
  };
}

module.exports = { crearEntorno: crearEntorno, formatearFecha: formatearFecha, TZ: TZ };
