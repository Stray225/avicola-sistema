'use strict';
/**
 * Compilador de plantillas con la misma sintaxis que HtmlService de Apps Script:
 *   <?= expresión ?>   imprime escapando HTML
 *   <?!= expresión ?>  imprime tal cual
 *   <? código ?>       ejecuta código
 * Sirve para chequear la sintaxis de los .html y para armar la hoja en los tests.
 */

function escaparHtml(v) {
  return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** Devuelve el cuerpo JS de una función que arma el HTML (usa __s, __esc). */
function compilarPlantilla(fuente) {
  var codigo = 'var __s = [];\n';
  var re = /<\?(!=|=)?([\s\S]*?)\?>/g;
  var ultimo = 0;
  var m;
  while ((m = re.exec(fuente))) {
    var texto = fuente.slice(ultimo, m.index);
    if (texto) codigo += '__s.push(' + JSON.stringify(texto) + ');\n';
    if (m[1] === '!=') codigo += '__s.push(String(' + m[2] + '));\n';
    else if (m[1] === '=') codigo += '__s.push(__esc(' + m[2] + '));\n';
    else codigo += m[2] + '\n';
    ultimo = re.lastIndex;
  }
  codigo += '__s.push(' + JSON.stringify(fuente.slice(ultimo)) + ');\nreturn __s.join("");';
  return codigo;
}

/** Los bloques <script> de un HTML, con los scriptlets reemplazados por null. */
function scriptsDeHtml(fuente) {
  var bloques = [];
  var re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  var m;
  while ((m = re.exec(fuente))) {
    bloques.push(m[1].replace(/<\?!?=?[\s\S]*?\?>/g, 'null'));
  }
  return bloques;
}

module.exports = { escaparHtml: escaparHtml, compilarPlantilla: compilarPlantilla, scriptsDeHtml: scriptsDeHtml };
