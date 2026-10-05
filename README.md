# Llegamos! · Avícola Belgrano — sistema de reparto

Un solo circuito, sin volver a tipear nada:

**PEDIDO** (se carga una vez) → **LISTA DE REPARTO EN EL CELU + HOJA PDF** → al entregar se toca **cobrado** → **CIERRE DEL DÍA** automático.

Cada venta queda guardada en la planilla y en el historial del cliente. Funciona con Google Sheets y Google Apps Script, así que **no cuesta nada**: no hay servidores ni servicios pagos.

- La **web app** se usa desde el celu (con un ícono en la pantalla de inicio) y tiene 6 pestañas: **HOY**, **NUEVO**, **EN RUTA**, **PENDIENTES**, **ESCRIBIR** (a quién escribir hoy para que vuelva a comprar) y **CIERRE**. Desde CIERRE se abre **NÚMEROS** (la semana actual contra la anterior).
- La **planilla** guarda todo y es donde cambiás precios, promos, zonas y textos. El código no tiene ningún precio ni texto fijo.
- **Recompra**: el sistema te dice a quién escribirle, te arma el mensaje y mide si funcionó. **Nada se manda solo**: los mensajes los mandás vos desde WhatsApp Business.
- **TABLERO**: los números por semana (ventas, ganancia, clientes nuevos, recompra, publicidad y lo que le queda al local).
- Este sistema **no lleva stock** (eso lo lleva otra gente) y **no se conecta a Meta** (el gasto en anuncios lo cargás vos en GASTO_META).

---

## Qué hay en este repositorio

| Archivo | Para qué sirve |
|---|---|
| `apps-script/Logica.gs` | Las cuentas: precios, costos, cierre, 70/30, recompra, tablero, teléfonos y fechas. |
| `apps-script/Codigo.gs` | El menú "Avícola", la instalación, la planilla, la ruta, el PDF, el cierre, RECOMPRA y TABLERO. |
| `apps-script/App.html` | La web app del celu. |
| `apps-script/Hoja.html` | El diseño de la hoja de reparto en PDF. |
| `tests/`, `package.json` | Pruebas automáticas (solo para el que programa). |
| `claude/` | Notas de traspaso entre sesiones de trabajo con Claude (estado y próximos pasos). |

---

## Instalación paso a paso (una sola vez, desde la compu)

### 1. Abrir el editor de código
1. Abrí la planilla **"AVÍCOLA BELGRANO — FUENTE ÚNICA | COSTOS Y PROMOS"**.
2. Arriba: **Extensiones → Apps Script**. Se abre una pestaña nueva.
3. Mirá la lista de **Archivos** de la izquierda:
   - Si solo hay un archivo `Código.gs` que dice `function myFunction() { }` y nada más, está vacío: podés seguir.
   - **Si hay cualquier otro código, NO lo borres.** Pará acá y avisale a quien te ayuda con el sistema, porque se podría pisar algo que ya funciona.

### 2. Crear los 4 archivos y pegar el código
Para cada archivo de la carpeta `apps-script` de este repositorio:

1. En GitHub, entrá al archivo y tocá el botón **"Copy raw file"** (el de los **dos cuadraditos**, arriba a la derecha del código). Eso copia todo.
2. En Apps Script, tocá el **+** al lado de "Archivos":
   - Para `Logica.gs` y `Codigo.gs`: elegí **Secuencia de comandos**.
   - Para `App.html` y `Hoja.html`: elegí **HTML**.
3. Escribí el nombre **exactamente igual y sin la terminación**: `Logica`, `Codigo`, `App`, `Hoja` (Apps Script le agrega `.gs` o `.html` solo).
4. Borrá lo que el archivo nuevo trae escrito, pegá lo que copiaste y guardá (ícono del disquete o **Ctrl + S**).

> Si quedó el archivo vacío `Código.gs` con `myFunction`, podés borrarlo (los tres puntitos al lado del nombre → Eliminar) o pegar ahí el contenido de `Codigo.gs`. Lo importante es que los HTML se llamen **App** y **Hoja**.

### 3. Poner la hora de Buenos Aires
En Apps Script: ⚙️ **Configuración del proyecto** (rueda a la izquierda) → **Zona horaria** → elegí **"(GMT-03:00) Hora de Argentina - Buenos Aires"** (o parecido).

### 4. Ejecutar `instalar` y autorizar
1. Abrí el archivo `Codigo.gs`.
2. Arriba, en la lista de funciones (al lado del botón **Ejecutar**), elegí **instalar** y tocá **Ejecutar**.
3. Google pide permisos: **Revisar permisos** → elegí tu cuenta.
4. Va a aparecer **"Google no verificó esta app"**. **Es normal**: no es una app de otra empresa, es tu propio código, en tu cuenta, y nadie más lo usa. Tocá **Configuración avanzada** → **Ir a … (no seguro)** → **Permitir**.
   - Pide ver y editar planillas (esta y las que importes), guardar archivos en tu Drive (los PDF de la hoja), mostrar el menú, usar Google Maps (para ordenar la ruta) y **ejecutarse cuando no estás presente** (para recalcular RECOMPRA y TABLERO solos todos los días a las 8).
5. Cuando termina, abajo aparece el registro con lo que hizo. Volvé a la planilla y **recargala** (F5): aparece el menú **Avícola**.

`instalar` crea las pestañas **CONFIG, PRECIOS, PROMOS VIGENTES, ZONAS, CLIENTES, PEDIDOS, PEDIDOS_ITEMS, GASTOS, CIERRE, HISTÓRICO, AVISOS, RECOMPRA, RECOMPRA_MENSAJES, GASTO_META y TABLERO**, y el **activador** que recalcula RECOMPRA, TABLERO y AVISOS todos los días a las 8 (Google elige un minuto entre las 8 y las 9). Si una pestaña ya existe, no la pisa: solo le agrega las columnas que le falten. **No toca INICIO, COSTOS, PROMOS ni STOCK.** Lo podés correr las veces que quieras (el activador no se duplica).

### 5. Completar lo que falta en la planilla
- **AVISOS** te dice qué falta: precios vacíos, códigos sin costo en COSTOS, promos "a revisar".
- **PRECIOS**: poné el precio público sugerido (el de Pedix). Si lo dejás vacío, la app te lo pide a mano.
- **PROMOS VIGENTES**: revisá precio y composición de las promos de ejemplo y borrá "a revisar".
- **CONFIG**: revisá dirección del local, porcentajes, hora de corte y textos de los mensajes.

### 6. Publicar la web app
1. En Apps Script: **Implementar → Nueva implementación**.
2. En "Seleccionar tipo" (rueda ⚙️) elegí **Aplicación web**.
3. **Ejecutar como: Yo** · **Quién tiene acceso: Solo yo**.
4. **Implementar** y copiá la **URL de la aplicación web** (termina en `/exec`). Ese link es solo tuyo: **no lo publiques**.

### 7. Ponerla en el celu
1. Mandate el link (por ejemplo por WhatsApp a vos mismo) y abrilo en **Chrome** con la misma cuenta de Google.
2. Menú **⋮ → Agregar a la pantalla principal**. (En iPhone: Safari → Compartir → **Agregar a inicio**.)
3. Listo: queda un ícono como cualquier app.

---

## Cómo actualizar el código sin cambiar el link

1. Pegá el código nuevo en los archivos que cambiaron y guardá.
2. **Implementar → Gestionar implementaciones** → lápiz ✏️ (**Editar**) → en **Versión** elegí **Nueva versión** → **Implementar**.
3. El link y el ícono del celu siguen siendo los mismos. Si la actualización trae columnas o pestañas nuevas, corré **Avícola → Instalar** (no borra nada).

> **Actualización de recompra y tablero:** cambian 3 archivos: `Logica.gs`, `Codigo.gs` y `App.html` (`Hoja.html` queda igual). Después de pegarlos y guardar, corré **Avícola → Instalar** (o la función `instalar` desde el editor): crea RECOMPRA, RECOMPRA_MENSAJES, GASTO_META y TABLERO, agrega las filas nuevas de CONFIG y las columnas "No escribir" y "Cliente de antes" de CLIENTES, y crea el activador de las 8. Google te va a pedir un permiso nuevo ("ejecutarse cuando no estás"): aceptalo. Hasta que corras Instalar, la pestaña ESCRIBIR te avisa que falta.

---

## Uso diario en 6 pasos

1. **Entra un pedido** (WhatsApp, Pedix, anuncio): **NUEVO** → buscá el cliente por nombre o teléfono. Si ya compró, tocá **Repetir el último pedido** y contestá **¿a la misma dirección?**. Si es nuevo: nombre, teléfono y calle y altura (los campos andan con el micrófono del teclado). Sumá productos con **+**, revisá el total (si cobrás distinto, cambialo: entiende "30 mil" o "$30.000") y **Guardar**. Podés mandarle la confirmación por WhatsApp con un toque. Si le habías escrito por recompra hace poco, el origen ya viene marcado como **Recompra**.
2. **A la mañana**: **HOY → Ordenar ruta** (Google Maps la arma saliendo y volviendo al local) → **Hoja PDF → 1ra vuelta**. Si querés, movés pedidos con ↑ ↓.
3. **Recompra**: **ESCRIBIR** te muestra a quién escribirle hoy (como mucho 15, los más importantes primero). En cada uno: **Escribir** (abre WhatsApp con el mensaje armado) o **Copiar**, lo mandás vos, y tocás **Listo**.
4. **En la calle**: en cada pedido **Avisar que voy** (abre WhatsApp con el mensaje escrito; lo mandás vos). Al entregar: **Cobrado efectivo** o **Cobrado MP** (o **Entregado** si paga después). Si no atiende: **No estaba** (abre WhatsApp y el pedido pasa a PENDIENTES). Lo que vendés con la mercadería de más: **EN RUTA** (teléfono opcional, pero conviene).
5. **Lo que entra después de imprimir** va solo a la **2da vuelta** y aparece igual en HOY. Podés imprimir la hoja de la 2da.
6. **A la noche**: **CIERRE** → cargá los gastos del día (nafta, bolsas…; por defecto "lo paga el local"; **la publicidad no**: va en GASTO_META), poné el **retiro real** y tocá **Cerrar el día**. Te muestra ventas, costo, ganancia, tu 70%, el 30% del local y lo que le queda después de gastos, efectivo/MP/transferencia/pendiente y la diferencia del retiro. Queda en las pestañas **CIERRE** e **HISTÓRICO**. Si quedó algo sin marcar, te avisa antes. Arriba está el botón **📊 Números de la semana**.

**Una vez por semana**: cargá en **GASTO_META** el lunes de la semana y lo que se gastó en anuncios.

### WhatsApp Business en otro teléfono: botón Copiar

Al lado de cada botón que abre WhatsApp (avisar que voy, no estaba, confirmación, escribirle en PENDIENTES y los de recompra) hay un botón **📋 Copiar**: copia el número (`+54 9 11 …`) y el mensaje, para pegarlos donde tengas WhatsApp Business. Copiar el de "No estaba" también manda el pedido a PENDIENTES (con Deshacer), igual que el botón de WhatsApp. Si el celu no deja copiar solo, te muestra el texto para copiarlo a mano.

### Cómo se reparte la plata en el cierre

- **Ganancia** = ventas − costo de mercadería.
- **Agustín 70%** de la ganancia, **completo**: no se le descuenta ningún gasto. Ese es el **retiro calculado**.
- **Local 30%** de la ganancia. De ahí se restan los **gastos que paga el local** (la nafta, la publicidad y todo lo demás, que es la opción por defecto) → **Le queda al local**.
- Si algún gasto lo marcás como **"se reparte entre los dos"**, se divide con los mismos porcentajes (70% vos, 30% el local): a tu retiro se le resta tu parte.
- Los porcentajes salen de **CONFIG**. Ejemplo: ventas $ 100.000, costo $ 60.000 → ganancia $ 40.000 → vos $ 28.000; local $ 12.000; si el local pagó $ 5.000 de nafta, le quedan $ 7.000.

**PENDIENTES** junta lo que no estaba, lo que no tiene dirección completa o fecha, y lo que quedó de días anteriores: lo reprogramás con un toque.

Los cambios se ven al instante y se van guardando solos en la planilla (arriba dice **✓ Guardado** o **⏳ Guardando**). Si te quedás sin señal, quedan en el celu y se suben cuando vuelve.

---

## Recompra: a quién escribir

El sistema arma la lista, el mensaje y mide si funcionó. **Nada se manda solo**: vos escribís desde WhatsApp Business.

- **RECOMPRA** (pestaña): una fila por cliente con al menos una compra entregada y teléfono válido, más los **clientes de antes** (están en CLIENTES pero no tienen ningún pedido cargado: los que se importaron de las compras de agosto y septiembre). No aparecen los marcados **"No escribir"**. Se rearma sola todos los días a las 8 y cuando querés con **Avícola → Recalcular recompra**.
- **Columnas**: prioridad, estado, nombre, tipo, teléfono, barrio, última compra, días desde la última compra, ciclo del cliente, qué compró la última vez, cantidad de compras, total gastado, **Escribir** (link de WhatsApp con el mensaje), **Le escribí** (casilla: al tildarla se guarda la fecha sola), **Le escribí el**, **Resultado**, **No escribir** (casilla) y el mensaje.
- **Ciclo del cliente**: el promedio de días entre sus compras si tiene 2 o más; si compró una sola vez, el de CONFIG (14 días).
- **Toca escribir hoy** si pasaron al menos tantos días como su ciclo desde la última compra (a los clientes de antes, siempre), si no le escribiste en los últimos 7 días y si **no tiene un pedido en curso** (por entregar o "no estaba").
- **Tope**: como mucho 15 por día (CONFIG). Si ya escribiste 5, la lista muestra 10 más. Los que pasan el tope quedan para los días siguientes.
- **Prioridad** (los de arriba primero): cliente de antes 100 puntos; los demás 50 + 10 por cada compra (hasta 5) + 20 si pasó su ciclo hace poco (menos del doble). Cada mensaje sin respuesta desde su último pedido resta 30. **Alta** desde 100, **Media** desde 60, **Baja** menos de 60.
- **Resultado**: **Volvió a comprar** si ese teléfono cargó un pedido (no cancelado) en los 7 días siguientes al mensaje; **Sin respuesta** si pasaron los 7 días; mientras tanto, **Esperando**. Cada mensaje queda en **RECOMPRA_MENSAJES**.
- **Origen**: si cargás un pedido de alguien a quien le escribiste en los últimos 7 días, la app te sugiere el origen **Recompra**.
- **Mensajes** (en CONFIG): según lo último que compró. Primero se busca una fila **"Mensaje recompra: "** con el nombre o código de la promo (ej. `Mensaje recompra: PROMO FULL`), después una con su categoría (ej. `Mensaje recompra: Huevos`) y si no, **"Mensaje recompra: general"**. Los clientes de antes tienen el suyo (**"Mensaje recompra: cliente de antes"**). Variables: `{nombre}`, `{ultima_compra}` (qué llevó) y `{dia_reparto}` ("hoy", "mañana" o "el jueves 8/10", según la hora de corte).
- **Nombres que son direcciones**: si el nombre empieza con "calle", "av", "avenida" o "entre", o tiene números, el mensaje saluda sin nombre ("¡Hola!").
- **Desde la planilla**: tildá **Le escribí** cuando le mandes el mensaje (la fecha se pone sola; si te equivocaste, destildala). Tildá **No escribir** si no quiere que le escriban: queda guardado en CLIENTES y desaparece en el próximo recálculo.

## Tablero y NÚMEROS

- **GASTO_META** (pestaña): una fila por semana con el **lunes** de esa semana y lo que se gastó en anuncios. La completás vos (o desde otro lado). Si ponés otro día, cuenta para la semana en la que cae.
- **TABLERO** (pestaña): las últimas 8 semanas, de lunes a domingo: pedidos, ventas, ganancia, margen, clientes nuevos, clientes que repitieron, % de la ganancia que vino de los que repiten, mensajes de recompra y % que volvió a comprar, gasto en Meta, costo por cliente nuevo (gasto en Meta ÷ clientes nuevos que vinieron por un anuncio), Agustín 70%, local 30%, gastos que paga el local y **lo que le queda al local** (30% − gastos − publicidad). Abajo, de las últimas 4 semanas: **por promo** (unidades, ganancia y % de compradores que volvieron a comprar), **por barrio** (pedidos y ganancia) y los **clientes activos** (compraron en los últimos 30 días), **en riesgo** (31 a 60) y **perdidos** (más de 60). Se recalcula solo a las 8 y con **Avícola → Recalcular tablero**.
- El local (Luciano) paga la mercadería, la nafta, la publicidad y todos los gastos: **la parte de Agustín no se toca**.
- **Clientes nuevos**: los que hicieron su primera compra esa semana. Los clientes de antes no cuentan como nuevos.
- **NÚMEROS** (web app, desde CIERRE): lo principal de esta semana contra la anterior, en tarjetas grandes.
- **La publicidad va solo en GASTO_META.** Si en GASTOS aparece un gasto que dice publicidad, anuncio o Meta, sale en **AVISOS** para que no se cuente dos veces (y la app te pregunta antes de cargarlo).

---

## Cómo cambiar cosas (sin tocar el código)

Después de cambiar algo en la planilla, en la app tocá **↻** (arriba a la derecha) para traerlo.

- **Un precio**: pestaña **PRECIOS**, columna "Precio público sugerido". Vacío = la app lo pide a mano. Desde la cantidad de maples de CONFIG ("Maples desde los que es mayorista", 6) la app no sugiere precio de huevos: lo ponés vos.
- **Un costo**: pestaña **COSTOS** (ver las reglas de abajo). Se escribe solo en "Costo compra" y "Actualizado"; "Costo unitario base" se calcula solo y es de donde lee la app.
- **Un producto nuevo**: agregalo en **COSTOS** con su código y su "Costo compra", copiá la fórmula de "Costo unitario base" de la fila de arriba y corré **Avícola → Instalar** (lo suma a PRECIOS con el precio vacío). En PRECIOS también podés:
  - "Unidades base por unidad de venta": si lo vendés en otra unidad que la del costo (por ejemplo por cajón y el costo es por maple, poné cuántos maples trae).
  - "Paso del + y −": por ejemplo `0,5` para los quesos por kilo.
  - "Activo": `no` para que no aparezca en la app.
- **Una promo**: pestaña **PROMOS VIGENTES**. A la izquierda, una fila por promo (código, nombre, precio, activa sí/no). A la derecha, la composición: una fila por producto con el código de la promo, el código del producto (de COSTOS) y la cantidad. El costo se calcula solo; si falta algún costo, aparece en AVISOS.
- **Una zona**: pestaña **ZONAS**, barrio y ¿llegamos? (`sí`, `no` o `consultar`). La app avisa al cargar un pedido.
- **Un texto de mensaje**: pestaña **CONFIG**, filas "Mensaje: …". Podés usar `{nombre}`, `{total}`, `{detalle}`, `{direccion}` y `{fecha}`.
- **Medios de pago, orígenes, hora de corte, feriados, porcentajes, margen mínimo**: también en **CONFIG**. Cada medio de pago es un botón "Cobrado…".
- **Un gasto**: se carga desde CIERRE en la app, o directo en la pestaña **GASTOS** (fecha, descripción, monto y "Quién lo paga": `lo paga el local` o `se reparte entre los dos`; si lo dejás vacío, lo paga el local). La publicidad no: va en **GASTO_META**.
- **Un mensaje de recompra**: en **CONFIG**, filas "Mensaje recompra: …". Para sumar uno para otra promo o categoría, agregá una fila con la clave `Mensaje recompra: ` y el nombre (por ejemplo `Mensaje recompra: Congelados`).
- **Plazos y topes de recompra**: en **CONFIG**, filas "Recompra: …" (ciclo por defecto, días sin volver a escribirle, días para ver si volvió a comprar, tope por día y las palabras de los nombres que son direcciones) y "Origen de los pedidos de recompra".
- **Tablero**: en **CONFIG**, filas "Tablero: …" (semanas, semanas del detalle, días para cliente activo y perdido), "Orígenes que son anuncios" y "Palabras de publicidad en GASTOS". La hora del recálculo automático también está ahí; si la cambiás, corré **Avícola → Instalar**.

---

### Reglas de la pestaña COSTOS (FUENTE ÚNICA)

| Columna | Qué va | ¿Se escribe a mano? |
|---|---|---|
| D · **Costo compra** | Lo que cuesta comprarlo, en la unidad de compra. | **Sí** |
| G · **Costo unitario base** | Fórmula (`=D/E`): costo por maple, kg o unidad. **La app de pedidos lee de acá.** | **Nunca**: si se pisa, se rompe la fórmula. |
| H · **Actualizado** | Fecha en que actualizaste ese costo. | **Sí** |

- **Almacén**: se carga a **precio por bulto de Maxiconsumo, por unidad**: el **precio de lista**, sin el descuento del QR.
- Al actualizar costos se escribe **solo en D y H**. El resto de las columnas no se toca.
- El sistema de pedidos **nunca escribe en COSTOS** (ni en INICIO, PROMOS o STOCK): solo lee. Hay un test que falla si alguna vez lo intenta.
- La columna "Categoría" ordena la CARGA de la hoja de reparto: un producto sin categoría aparece en "Otros".

## Importar lo que ya tenías (una sola vez, desde el menú Avícola)

- **Importar clientes**: exportá tus contactos (Google Contactos → Exportar → CSV de Google), abrilo como planilla de Google y pegá su link o ID en **CONFIG → "ID planilla de clientes a importar"**. Usa las columnas "Given Name", "Phone 1 - Value", "Address 1 - Formatted" y "Notes". Arregla los teléfonos y no duplica. Quedan marcados como **clientes de antes** (no cuentan como nuevos en el TABLERO y entran en RECOMPRA con prioridad alta).
- **Importar ventas de octubre**: pegá el link o ID de la planilla vieja (la que tiene la pestaña **Ventas**) en **CONFIG → "ID planilla de ventas a importar"**. Entran como pedidos entregados, aunque no tengan teléfono. Si lo corrés dos veces, no duplica.

---

## Problemas comunes

- **Error de Google al abrir la app ("no se pudo abrir el archivo", "página no encontrada") cuando hay varias cuentas abiertas**: pasa si en el navegador hay más de una cuenta de Google y la principal no es la dueña de la planilla. Soluciones: en Chrome del celu entrá a google.com → tu foto → **Cerrar sesión en todas las cuentas** y volvé a entrar solo con la del negocio; o usá otro navegador (por ejemplo Firefox) con una sola cuenta y agregá el ícono desde ahí. Para probar rápido: abrí el link en una pestaña de incógnito y entrá con tu cuenta.
- **Los botones de WhatsApp abren el WhatsApp personal y no el Business** (Android): Ajustes del celu → Aplicaciones → **WhatsApp** (el personal) → **Abrir de forma predeterminada** → desactivá **"Abrir links compatibles"**. Así los links abren WhatsApp Business. Otra opción: en **CONFIG** poné **"Abrir WhatsApp Business en Android" = sí** (abre directo el Business; solo sirve en Android). En iPhone no se puede elegir cuál abre.
- **Arriba dice "⚠️ Sin guardar"**: no hubo conexión o algo falló varias veces. Tocá el aviso → **Reintentar**. No se pierde nada mientras no toques "Descartar".
- **"No encontré la dirección" al ordenar la ruta**: revisá calle y altura y el barrio (escribila como la buscarías en Google Maps). Esos pedidos quedan al final.
- **El menú "Avícola" no aparece**: recargá la planilla.
- **Las fechas salen corridas un día**: revisá que la zona horaria del proyecto (paso 3) sea Buenos Aires.
- **Cambié precios y la app no los muestra**: tocá **↻**.
- **WhatsApp Business está en otro teléfono**: usá **📋 Copiar** al lado del botón de WhatsApp y pegá el número y el mensaje en el otro teléfono.
- **RECOMPRA o TABLERO no se actualizaron solos**: en Apps Script, a la izquierda, **Activadores** (el reloj): tiene que haber uno de `recalcularTodoDiario`. Si no está, corré **Avícola → Instalar**. Mientras tanto, usá **Avícola → Recalcular recompra / Recalcular tablero**.
- **La pestaña ESCRIBIR dice que falta Instalar**: actualizaste el código pero no corriste **Avícola → Instalar**.
- **Aparece "Publicidad en GASTOS" en AVISOS**: borrá ese gasto de GASTOS y cargalo en GASTO_META (o cambiale la descripción si no era publicidad).

---

## Para el que programa

- `npm run verificar` (Node 20 o más nuevo, no hace falta instalar nada) chequea la sintaxis de los `.gs` y del JavaScript de los `.html`, que la web app solo llame funciones que existen, que no haya IDs, links ni teléfonos reales, y corre los tests.
- `Logica.gs` son funciones puras (con `module.exports` al final para Node). La web app recibe esa misma función (`crearLogica_.toString()`), así el celu y la planilla calculan igual.
- `tests/apoyo/simulador.js` imita SpreadsheetApp, Drive, Maps, activadores, casillas y texto con link para probar `Codigo.gs` de punta a punta (con `moverReloj` se prueba lo que pasa días después). Todos los datos de prueba son inventados.
- Tests: `logica.test.js` (cuentas), `recompra.test.js` (recompra, copiar, publicidad y tablero), `flujo.test.js` y `flujo-recompra.test.js` (la planilla de punta a punta).
- RECOMPRA se rearma entera; lo que importa guardar vive en CLIENTES ("No escribir", "Cliente de antes") y en RECOMPRA_MENSAJES (un renglón por mensaje). `onEdit` (activador simple) guarda lo que se tilda en RECOMPRA y, por las dudas, al recalcular se leen las casillas antes de borrar.
- Las pestañas se leen y escriben **por nombre de encabezado**. Teléfonos `+549` + 10 dígitos como texto; fechas como fechas de Sheets en hora de Buenos Aires; plata en pesos enteros.
- **CLIENTES, PEDIDOS y PEDIDOS_ITEMS** son la base de la recompra y del tablero: el teléfono es la clave del cliente, `ID pedido` une PEDIDOS con PEDIDOS_ITEMS, y CLIENTES se recalcula solo (primera/última compra, cantidad, total gastado).
