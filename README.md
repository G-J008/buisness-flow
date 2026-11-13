# Argus Technology Commercial Software
Ventas, inventario, clientes y reportes para negocios comerciales (antes "Business Flow").
Next.js + PostgreSQL (Neon), publicado en Vercel.

## Novedades (nov 2026)
- **Cantidad por artículo**: una línea de inventario puede tener varias unidades y una venta puede llevar varias unidades del mismo artículo. El artículo pasa a "Vendido" recién cuando sale la última unidad.
- **Ganancia real**: el resultado del mes es ventas − costo de lo vendido − gastos operativos. La facturación y el flujo de caja (que incluye compras de inventario) se muestran aparte.
- **Reportes**: resultado del mes, ganancia por marca, detalle de ventas con costo y margen, gastos operativos, forma de pago y entrega, mejores clientes, vendedores, últimos 12 meses. PDF actualizado.
- **Diseño**: nueva tipografía (Source Serif 4 para títulos y cifras, Instrument Sans para textos) y paneles más sobrios, misma paleta.
- **Móvil**: barra inferior con acceso a Panel, Flujo, Reportes e Inventario, menú "Más", tablas en formato de fichas y formularios a pantalla completa.
- Los vendedores no reciben costos ni márgenes.
- Next.js actualizado a 14.2.35 (parche de seguridad).

Base de datos: solo se agregan columnas (`inventory.quantity`, `sale.quantity`, `sale.unitCost`); los datos existentes no se modifican.

## Novedades (sep 2026)
- Pagos de clientes en el estado de cuenta (descuentan el saldo a crédito).
- Inventario por mes: piezas disponibles al cierre, valor a costo y a precio de venta, días en inventario.
- El costo de cada pieza nueva se registra solo como gasto "Compra de inventario".
- Panel: ventas por marca del mes.
- Login compatible con el guardado de contraseñas del navegador.
