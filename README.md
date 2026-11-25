# Argus Technology Commercial Software
Ventas, inventario, clientes y reportes para negocios comerciales (antes "Business Flow").
Next.js + PostgreSQL (Neon), publicado en Vercel.

## Argus Construction Division (nov 2026)
Al crear una empresa, el admin elige **Comercio de artículos** o **Construcción y Obras**. Son dos sistemas distintos sobre la misma base de datos; los clientes, usuarios y cajas se comparten.

Hojas de una empresa de Construcción y Obras:
1. **Obras**: obras en curso con su % de avance (tareas terminadas / total), ordenadas por vista general, antigüedad o prioridad (tareas por vencer). Muestra el próximo cobro, el próximo pago y los recordatorios.
2. **Propuestas**: formato estándar con el logo y los datos fijos de la empresa (nombre, número, RUC, contacto, email). Los datos variables y los trabajos salen del presupuesto elegido. Se descargan en PDF con espacio para firmas, y "Aprobada: crear obra" crea la obra.
3. **Presupuestos**: cada ítem tiene medidas, cantidad, partes (vidrio, perfil…) con proveedor y producto, accesorios por cantidad y mano de obra por ítem o por m². El nombre se arma solo ("Puerta mano amiga con vidrio Fumé y perfil Amaderado"). El precio al cliente es el costo más el margen %. Se puede duplicar ítems y cambiar cantidades.
4. **Calendario de pagos**: cobros a clientes y pagos a proveedores, con cheque (número y fecha a debitarse). Al marcar pagado se elige la caja. Cada carga o cambio queda en el registro.
5. **Base de datos**: proveedores, categorías, productos con precio por m², por metro lineal o por unidad (con la fecha de la última actualización), y tipos de ítem.

Los vendedores arman presupuestos y propuestas viendo precios con el margen ya incluido: nunca reciben costos de proveedores ni el margen. El margen por defecto y los datos de la propuesta (RUC, contacto, email, datos bancarios) se cargan en Perfil y Ajustes.

**Importar desde Excel** (Base de datos): se pega la tabla Proveedor · Categoría · Producto · Unidad · Precio · Código, con plantilla para descargar.
- Antes de guardar se muestra cada fila como nueva, actualiza precio, sin cambios, posible duplicado o error.
- Los nombres se comparan sin mayúsculas, tildes ni espacios ("Fumé 6 mm" = "FUME 6MM"). Si hay código, el código identifica el producto. Nombres con números distintos (6 mm / 8 mm) son productos distintos.
- El servidor revisa fila por fila: las filas repetidas, los duplicados exactos y los errores se omiten y se informan, y el resto se carga.
- Los formularios también rechazan duplicados exactos de proveedor, categoría, producto y tipo de ítem.
- Los tipos de ítem también se importan, una fila por parte.

Consola de Admin: una empresa sin datos se puede eliminar (junto con sus perfiles, previa confirmación). Si tiene ventas, inventario, clientes, movimientos de caja o datos de construcción, la app indica qué tiene y no la borra.

Base de datos: tablas nuevas `c_*` y columnas nuevas (`company.kind`, datos de propuesta, `client.ruc`). Las empresas existentes quedan como "Comercio de artículos".

## Novedades (nov 2026, segunda entrega)
- **Cajas**: por defecto Gs · Banco, Gs · Efectivo, USD · Banco y USD · Efectivo; se pueden crear más. Depósitos, retiros y transferencias entre cajas (también entre Gs y USD) piden siempre la cotización del día.
- Las ventas al contado, gastos, otros ingresos, cobros a clientes y compras de inventario eligen su caja y generan el movimiento solos. Una venta a crédito no mueve caja hasta que el cliente paga.
- Cada movimiento guarda usuario, fecha y hora. Se pueden editar; cada creación, edición y eliminación queda en el **Registro de cambios** con los valores anteriores y nuevos.
- **Panel**: solo el mes en curso, en paneles de texto (ventas, ganancia, caja y crédito, cajas). La ganancia se lee en palabras: "de cada ₲ 100 facturados, ₲ X son ganancia neta".
- **Gráficos**: hoja nueva con los gráficos y los meses anteriores.
- **Tipografía**: una sola, Helvetica (Arial donde Helvetica no está instalada), también en los PDF.
- **Consola de Admin**: botón "Nuevo admin maestro".

Base de datos: solo tablas nuevas (`caja`, `caja_mov`, `caja_log`); los datos existentes no se modifican. Las cajas empiezan en cero: cargá el saldo inicial con un depósito.

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
