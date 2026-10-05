# Llegamos! · Avícola Belgrano — sistema de reparto

Un solo circuito, sin volver a tipear nada:

**PEDIDO** (se carga una vez) → **LISTA DE REPARTO EN EL CELU + HOJA PDF** → al entregar se toca **cobrado** → **CIERRE DEL DÍA** automático.

Cada venta queda guardada en la planilla y en el historial del cliente. Funciona con Google Sheets y Google Apps Script, así que **no cuesta nada**: no hay servidores ni servicios pagos.

- La **web app** se usa desde el celu (con un ícono en la pantalla de inicio) y tiene 5 pestañas: **HOY**, **NUEVO**, **EN RUTA**, **PENDIENTES** y **CIERRE**.
- La **planilla** guarda todo y es donde cambiás precios, promos, zonas y textos. El código no tiene ningún precio ni texto fijo.
- Este sistema **no lleva stock** (eso lo lleva otra gente).

---

## Qué hay en este repositorio

| Archivo | Para qué sirve |
|---|---|
| `apps-script/Logica.gs` | Las cuentas: precios, costos, cierre, 70/30, teléfonos y fechas. |
| `apps-script/Codigo.gs` | El menú "Avícola", la instalación, la planilla, la ruta, el PDF y el cierre. |
| `apps-script/App.html` | La web app del celu. |
| `apps-script/Hoja.html` | El diseño de la hoja de reparto en PDF. |
| `tests/`, `package.json` | Pruebas automáticas (solo para el que programa). |

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
   - Pide ver y editar planillas (esta y las que importes), guardar archivos en tu Drive (los PDF de la hoja), mostrar el menú y usar Google Maps (para ordenar la ruta).
5. Cuando termina, abajo aparece el registro con lo que hizo. Volvé a la planilla y **recargala** (F5): aparece el menú **Avícola**.

`instalar` crea las pestañas **CONFIG, PRECIOS, PROMOS VIGENTES, ZONAS, CLIENTES, PEDIDOS, PEDIDOS_ITEMS, GASTOS, CIERRE, HISTÓRICO y AVISOS**. Si alguna ya existe, no la pisa. **No toca INICIO, COSTOS, PROMOS ni STOCK.** Lo podés correr las veces que quieras.

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

---

## Uso diario en 5 pasos

1. **Entra un pedido** (WhatsApp, Pedix, anuncio): **NUEVO** → buscá el cliente por nombre o teléfono. Si ya compró, tocá **Repetir el último pedido** y contestá **¿a la misma dirección?**. Si es nuevo: nombre, teléfono y calle y altura (los campos andan con el micrófono del teclado). Sumá productos con **+**, revisá el total (si cobrás distinto, cambialo: entiende "30 mil" o "$30.000") y **Guardar**. Podés mandarle la confirmación por WhatsApp con un toque.
2. **A la mañana**: **HOY → Ordenar ruta** (Google Maps la arma saliendo y volviendo al local) → **Hoja PDF → 1ra vuelta**. Si querés, movés pedidos con ↑ ↓.
3. **En la calle**: en cada pedido **Avisar que voy** (abre WhatsApp con el mensaje escrito; lo mandás vos). Al entregar: **Cobrado efectivo** o **Cobrado MP** (o **Entregado** si paga después). Si no atiende: **No estaba** (abre WhatsApp y el pedido pasa a PENDIENTES). Lo que vendés con la mercadería de más: **EN RUTA** (teléfono opcional, pero conviene).
4. **Lo que entra después de imprimir** va solo a la **2da vuelta** y aparece igual en HOY. Podés imprimir la hoja de la 2da.
5. **A la noche**: **CIERRE** → cargá los gastos del día (nafta, publicidad, bolsas…; por defecto "lo paga el local"), poné el **retiro real** y tocá **Cerrar el día**. Te muestra ventas, costo, ganancia, tu 70%, el 30% del local y lo que le queda después de gastos, efectivo/MP/transferencia/pendiente y la diferencia del retiro. Queda en las pestañas **CIERRE** e **HISTÓRICO**. Si quedó algo sin marcar, te avisa antes.

### Cómo se reparte la plata en el cierre

- **Ganancia** = ventas − costo de mercadería.
- **Agustín 70%** de la ganancia, **completo**: no se le descuenta ningún gasto. Ese es el **retiro calculado**.
- **Local 30%** de la ganancia. De ahí se restan los **gastos que paga el local** (la nafta, la publicidad y todo lo demás, que es la opción por defecto) → **Le queda al local**.
- Si algún gasto lo marcás como **"se reparte entre los dos"**, se divide con los mismos porcentajes (70% vos, 30% el local): a tu retiro se le resta tu parte.
- Los porcentajes salen de **CONFIG**. Ejemplo: ventas $ 100.000, costo $ 60.000 → ganancia $ 40.000 → vos $ 28.000; local $ 12.000; si el local pagó $ 5.000 de nafta, le quedan $ 7.000.

**PENDIENTES** junta lo que no estaba, lo que no tiene dirección completa o fecha, y lo que quedó de días anteriores: lo reprogramás con un toque.

Los cambios se ven al instante y se van guardando solos en la planilla (arriba dice **✓ Guardado** o **⏳ Guardando**). Si te quedás sin señal, quedan en el celu y se suben cuando vuelve.

---

## Cómo cambiar cosas (sin tocar el código)

Después de cambiar algo en la planilla, en la app tocá **↻** (arriba a la derecha) para traerlo.

- **Un precio**: pestaña **PRECIOS**, columna "Precio público sugerido". Vacío = la app lo pide a mano. Desde la cantidad de maples de CONFIG ("Maples desde los que es mayorista", 6) la app no sugiere precio de huevos: lo ponés vos.
- **Un producto nuevo**: agregalo en **COSTOS** con su código y su costo y corré **Avícola → Instalar** (lo suma a PRECIOS con el precio vacío). En PRECIOS también podés:
  - "Unidades base por unidad de venta": si lo vendés en otra unidad que la del costo (por ejemplo por cajón y el costo es por maple, poné cuántos maples trae).
  - "Paso del + y −": por ejemplo `0,5` para los quesos por kilo.
  - "Activo": `no` para que no aparezca en la app.
- **Una promo**: pestaña **PROMOS VIGENTES**. A la izquierda, una fila por promo (código, nombre, precio, activa sí/no). A la derecha, la composición: una fila por producto con el código de la promo, el código del producto (de COSTOS) y la cantidad. El costo se calcula solo; si falta algún costo, aparece en AVISOS.
- **Una zona**: pestaña **ZONAS**, barrio y ¿llegamos? (`sí`, `no` o `consultar`). La app avisa al cargar un pedido.
- **Un texto de mensaje**: pestaña **CONFIG**, filas "Mensaje: …". Podés usar `{nombre}`, `{total}`, `{detalle}`, `{direccion}` y `{fecha}`.
- **Medios de pago, orígenes, hora de corte, feriados, porcentajes, margen mínimo**: también en **CONFIG**. Cada medio de pago es un botón "Cobrado…".
- **Un gasto**: se carga desde CIERRE en la app, o directo en la pestaña **GASTOS** (fecha, descripción, monto y "Quién lo paga": `lo paga el local` o `se reparte entre los dos`; si lo dejás vacío, lo paga el local).

---

## Importar lo que ya tenías (una sola vez, desde el menú Avícola)

- **Importar clientes**: exportá tus contactos (Google Contactos → Exportar → CSV de Google), abrilo como planilla de Google y pegá su link o ID en **CONFIG → "ID planilla de clientes a importar"**. Usa las columnas "Given Name", "Phone 1 - Value", "Address 1 - Formatted" y "Notes". Arregla los teléfonos y no duplica.
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

---

## Para el que programa

- `npm run verificar` (Node 20 o más nuevo, no hace falta instalar nada) chequea la sintaxis de los `.gs` y del JavaScript de los `.html`, que la web app solo llame funciones que existen, que no haya IDs, links ni teléfonos reales, y corre los tests.
- `Logica.gs` son funciones puras (con `module.exports` al final para Node). La web app recibe esa misma función (`crearLogica_.toString()`), así el celu y la planilla calculan igual.
- `tests/apoyo/simulador.js` imita SpreadsheetApp, Drive, Maps, etc. para probar `Codigo.gs` de punta a punta. Todos los datos de prueba son inventados.
- Las pestañas se leen y escriben **por nombre de encabezado**. Teléfonos `+549` + 10 dígitos como texto; fechas como fechas de Sheets en hora de Buenos Aires; plata en pesos enteros.
- **CLIENTES, PEDIDOS y PEDIDOS_ITEMS** quedan limpios para la próxima etapa (recompra y tablero): el teléfono es la clave del cliente, `ID pedido` une PEDIDOS con PEDIDOS_ITEMS, y CLIENTES se recalcula solo (primera/última compra, cantidad, total gastado).
