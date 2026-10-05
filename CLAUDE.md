# Reglas para trabajar en este repo (Llegamos! / Avícola Belgrano)

- Todo en castellano rioplatense: interfaz, comentarios, README, commits y PRs. Sin preguntas durante el trabajo: decidir lo razonable y anotarlo en la PR.
- Antes de subir: `npm run verificar` en verde.
- El repo es público: nada de IDs de planillas, links de la web app, teléfonos ni datos reales de clientes (ni en código, tests o docs). Los tests usan datos inventados (`11 5555-xxxx`).
- Para retomar trabajo anterior: `claude/` (traspasos) y el `README.md`.

## FUENTE ÚNICA, pestaña COSTOS

- **Almacén**: se carga a precio por bulto de **Maxiconsumo** (precio de **lista**, sin el descuento del QR), **por unidad**.
- Al actualizar costos, escribir **solo** en **"Costo compra" (columna D)** y **"Actualizado" (columna H)**.
- **Nunca** escribir en **"Costo unitario base" (columna G)**: es una fórmula (`=D/E`) y la app de pedidos lee de ahí. Tampoco tocar las demás columnas.
- El código de `apps-script/` no escribe en COSTOS, INICIO, PROMOS ni STOCK: en los tests esas pestañas están protegidas (`proteger()` en `tests/apoyo/simulador.js`) y cualquier escritura hace fallar `npm run verificar`.

## Promos

- La **PROMO FULL** lleva **maple B2** (`H-B2`), no B1.
