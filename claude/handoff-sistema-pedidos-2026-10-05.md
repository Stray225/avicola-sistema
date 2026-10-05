# Traspaso — sistema de pedidos (Llegamos! / Avícola Belgrano) · 2026-10-05

> Para retomar en otra sesión: leé este archivo, el README y `apps-script/`, y seguí desde **Próximos pasos**.
> Todo en castellano rioplatense. Sin preguntas durante el trabajo: decidir lo razonable y anotarlo en la PR.

## Dónde quedó

- Etapa 1 (pedidos, reparto y cierre): mergeada en `main`.
- **Etapa 2 (esta): arreglos + recompra + tablero**, en la rama `claude/fervent-babbage-6uqj24`, con PR abierta contra `main`. `npm run verificar` en verde (72 tests).
- Probado con el simulador de Google y en Chromium con pantalla de celular. **Falta probarlo en Google Apps Script de verdad.**

## Qué trae la etapa 2

1. **Arreglos**
   - Botón **📋 Copiar** (número `+54 9 …` + mensaje) al lado de cada botón de WhatsApp: avisar que voy, no estaba, confirmación, escribirle (PENDIENTES) y recompra.
   - Gasto de **GASTOS** que dice publicidad, anuncio o Meta → aviso en **AVISOS**. La app pregunta antes de cargarlo.
2. **Recompra**: pestañas **RECOMPRA** (se rearma desde el menú y sola todos los días a las 8 con un activador) y **RECOMPRA_MENSAJES** (un renglón por mensaje), pestaña **ESCRIBIR** en la web app, origen "Recompra" sugerido, clientes de antes, tope diario y mensajes de CONFIG con {nombre}, {ultima_compra} y {dia_reparto}.
3. **Tablero**: pestañas **GASTO_META** (semana + monto) y **TABLERO** (8 semanas + detalle de 4 por promo y por barrio + clientes activos, en riesgo y perdidos) y pantalla **NÚMEROS** (se abre desde CIERRE).

## Decisiones (están también en la PR)

- **CLIENTES** suma "No escribir" y "Cliente de antes". Cliente de antes = está en CLIENTES sin ningún pedido cargado. Los contactos importados quedan marcados así y no cuentan como clientes nuevos en el TABLERO.
- **Toca escribir**: días desde la última compra ≥ ciclo (los de antes, siempre), no se le escribió en los últimos X días y **no tiene un pedido en curso**.
- **Prioridad**: cliente de antes 100; los demás 50 + 10 por compra (hasta 5) + 20 si pasó su ciclo hace poco (< 2 ciclos); −30 por cada mensaje sin respuesta desde su último pedido. Alta ≥ 100, Media ≥ 60, Baja < 60.
- **Tope**: la lista de hoy muestra como mucho (tope − mensajes ya mandados hoy).
- **Resultado**: "Volvió a comprar" si cargó un pedido no cancelado después del mensaje y dentro de N días; "Sin respuesta" si pasaron N días; si no, "Esperando".
- **Casillas de RECOMPRA**: `onEdit` (activador simple). Al recalcular, primero se leen las casillas por si algo no pasó por `onEdit`. El link "Escribir" va con texto enriquecido (no depende del idioma de la planilla).
- **Web app**: 6 pestañas abajo (HOY, NUEVO, EN RUTA, PENDIENTES, ESCRIBIR, CIERRE). NÚMEROS se abre desde CIERRE.
- **TABLERO**: gastos que paga el local = sus gastos de GASTOS + su parte de los que se reparten. Le queda al local = local 30% − esos gastos − gasto en Meta. La parte de Agustín no se toca.
- Los pedidos "no estaba" de más de 7 días ahora también llegan al celu (siguen en PENDIENTES).

## Próximos pasos

1. **Instalar la etapa 2 en Google**: pegar `Logica.gs`, `Codigo.gs` y `App.html` (Hoja.html no cambió), guardar, correr **Avícola → Instalar** y aceptar el permiso nuevo ("ejecutarse cuando no estás"). Después, **Implementar → Gestionar implementaciones → Editar → Nueva versión**.
2. Revisar en Apps Script → **Activadores** que exista `recalcularTodoDiario` (diario, 8 a 9 h).
3. Probar: tildar "Le escribí" en RECOMPRA (la fecha se tiene que poner sola), el botón Copiar en el celu, cargar el gasto de Meta en GASTO_META y mirar TABLERO y NÚMEROS.
4. Revisar los mensajes de recompra de ejemplo en CONFIG y sumar los de otras promos o categorías ("Mensaje recompra: …").
5. Si algo no anda en Google real (permisos del activador, casillas, links del TABLERO), anotarlo acá y arreglarlo en una PR nueva desde `main`.
