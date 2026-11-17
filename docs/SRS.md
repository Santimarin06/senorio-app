# SRS v2 - Señorío Barber: app móvil de reservas

Nov 6, 2026 · v2.1 del 14 nov 2026: incorpora las decisiones D-01 a D-16 de `docs/decisiones.md`.

## 1. Introducción

Señorío Barber gestiona hoy sus citas por WhatsApp y a mano. Esta app permite que el cliente reserve por sí mismo viendo la disponibilidad real, y que la barbería controle agenda, anticipos y multas desde el celular. Esta versión 2 incorpora las respuestas del cliente y los lineamientos del proyecto final de Móvil II; lo que sigue sin confirmar está en la sección 10.

| Tema | Descripción |
|---|---|
| Cliente | Señorío Barber (barbería y manicura) |
| Usuario principal | El cliente que reserva una cita |
| Proceso actual | Las citas se gestionan por WhatsApp y a mano |
| Proceso con la app | El cliente elige servicios, profesional y franja de la semana, acepta la política de multas y reserva; puede pagar un anticipo y enviar el comprobante; el aviso llega al WhatsApp de la barbería |
| Beneficio esperado | Reservas sin coordinar uno a uno por WhatsApp, agenda visible por profesional y reglas de multa y tolerancia aplicadas por la app |

**Proceso principal:** reservar una cita de principio a fin.

**Funciones complementarias** (los lineamientos exigen al menos dos):

- **Cotizador de productos:** carrito que calcula el total y se envía por WhatsApp; no se paga en la app.
- **Panel de administración y de profesional:** agenda, catálogo de servicios y productos, multas y comprobantes de pago.
- **Mapa de la barbería:** ubicación del local y de la persona que consulta.
- **Cancelar, reagendar y anticipo:** con las reglas de la sección 3.

**Definiciones**

| Término | Significado |
|---|---|
| Profesional | Barbero o manicurista que atiende citas |
| Franja | Bloque de tiempo reservable, según la duración de los servicios elegidos |
| Anticipo | Pago opcional antes de la cita: abono (mínimo $10.000) o total |
| Cita no asistida | Cita a la que el cliente no llegó dentro de los 10 minutos de tolerancia |
| Cotización | Lista de productos con precios fijos enviada por WhatsApp; no implica pago |
| Panel | Sección de la app para administrador y profesional |

## 2. Descripción general

La app es una sola aplicación móvil con tres roles. Las pantallas del panel solo aparecen a quien inicia sesión como administrador o profesional.

**Roles**

| Rol | Qué hace |
|---|---|
| Cliente | Se registra, reserva, cancela, reagenda, sube comprobantes de pago y cotiza productos |
| Profesional (barbero o manicurista) | Usa el panel: ve solo su propia agenda y marca la asistencia de sus citas; recibe un recordatorio como notificación en su dispositivo |
| Administrador | Usa el panel: ve toda la agenda y gestiona servicios, productos, profesionales, multas, comprobantes y días de trabajo |

**Profesionales iniciales**

| Profesional | Cargo | Servicios que presta |
|---|---|---|
| Mario | Barbero | Cortes, colorimetría, rizos semipermanentes |
| Camilo | Barbero | Cortes, colorimetría, rizos semipermanentes |
| Rosmery | Manicurista | Mascarillas, uñas |

Que los barberos hagan los cortes y que Rosmery haga las uñas es un supuesto; el cliente confirmó solo mascarillas (Rosmery) y colorimetría y rizos (barberos).

**Horario de atención**

| Días | Horario |
|---|---|
| Lunes a jueves | 9:00 a. m. a 7:30 p. m. |
| Viernes y sábado | 9:00 a. m. a 8:30 p. m. |
| Domingos y festivos | Cerrado por defecto; el administrador habilita los días que se trabajan, de 10:00 a. m. a 4:00 p. m. |
| Almuerzo (todos los profesionales) | 12:00 m. a 1:00 p. m., sin citas |

**Restricciones**

- React Native con TypeScript y Expo; se prueba en un teléfono Android.
- Entrega el 19 de noviembre de 2026.
- WhatsApp con enlace prellenado (wa.me), sin costo; el cliente debe pulsar "enviar".
- Todas las fechas en la zona horaria America/Bogota (UTC-05:00).
- Sin pasarela de pagos dentro de la app en esta versión.

**Supuestos**

- El administrador carga y mantiene servicios y productos desde el panel.
- El cliente tiene WhatsApp instalado en su celular.

## 3. Reglas de negocio y parámetros

Los valores se guardan como configuración, no en el código. "Provisional" es un supuesto del equipo que el cliente aún no confirmó.

**Parámetros**

| Parámetro | Valor | Estado |
|---|---|---|
| Tolerancia de llegada | 10 minutos | Confirmado |
| Cancelación sin multa | Hasta 4 horas antes de la cita | Confirmado |
| Multa | $10.000 fijos, por no asistir o por cancelar con menos de 4 horas | Confirmado |
| Cobro de la multa | Se descuenta del anticipo | Confirmado |
| Multa de un cliente sin anticipo | Se bloquea su siguiente reserva hasta pagarla | Confirmado |
| Anticipo | Opcional: pago total o abono mínimo de $10.000 | Confirmado |
| Cancelar con 4 horas o más y reagendar | El anticipo se aplica a la nueva cita | Confirmado |
| Cancelar con 4 horas o más sin reagendar | Se devuelve el anticipo menos $2.000 fijos, el mismo día de la cancelación | Confirmado |
| Cancelar con menos de 4 horas sin reagendar | Se descuenta la multa y se devuelve el resto menos $2.000 | Confirmado |
| Plazo para reagendar una cita no asistida | Hasta 2 días desde la fecha de la cita | Confirmado |
| WhatsApp de la barbería | 3189773741 para reservas, cancelaciones, cotizaciones y comprobantes | Confirmado |
| Recordatorio al profesional | Notificación en su dispositivo 30 minutos antes de la cita, no por WhatsApp | Confirmado |
| Medios de pago del anticipo | Nequi 3017821621, llave Bold @bold31897737 y cuenta de ahorros Bancolombia 1700-1463-4228; se cargan como configuración (D-04) | Confirmado |
| Paso entre franjas | Las franjas empiezan cada 15 minutos (D-07) | Confirmado |
| Sobrante del anticipo en una no asistencia | El cliente elige devolución (sobrante − $2.000) o pasarlo a la cita reagendada (D-05) | Confirmado |
| Pago con tarjeta dentro de la app | No en esta versión; posible en una segunda | Confirmado |
| Colores de la marca | Blanco, negro y gris | Confirmado |

**Reglas**

| ID | Regla |
|---|---|
| RN-01 | Solo se ofrecen franjas dentro del horario de atención y fuera del almuerzo (12:00 m. a 1:00 p. m.); la cita debe terminar antes del cierre o del almuerzo. |
| RN-02 | Un profesional no puede tener dos citas que se solapen. |
| RN-03 | Una cita puede incluir varios servicios: su duración y su precio son la suma de los servicios elegidos y sus adicionales (por ejemplo, silla relajante). |
| RN-04 | Cada servicio solo se ofrece con los profesionales que lo prestan. Todos los servicios de una cita los presta un mismo profesional. |
| RN-05 | Pasados 10 minutos de la hora de la cita sin llegada, la cita queda "Por marcar" y el profesional o el administrador la marca a mano como no asistida (D-08). |
| RN-06 | La no asistencia y la cancelación con menos de 4 horas generan una multa de $10.000, que se descuenta del anticipo. |
| RN-07 | Un cliente con multa pendiente (no cubierta por un anticipo) no puede reservar ni pagar anticipos de reservas nuevas hasta pagarla o hasta que el administrador la perdone (D-06). |
| RN-08 | El abono no puede ser menor a $10.000 ni mayor al valor de la cita. |
| RN-09 | El anticipo cuenta como pagado cuando el administrador revisa el comprobante subido por el cliente y lo confirma. |
| RN-10 | Domingos y festivos permanecen cerrados hasta que el administrador habilite el día, de 10:00 a. m. a 4:00 p. m. |
| RN-11 | La cotización usa los precios fijos del catálogo, se envía solo por WhatsApp y no se paga en la app; cada producto se cotiza de 1 a 10 unidades. |
| RN-12 | La base de datos es la fuente de verdad: la cita queda registrada aunque el cliente no envíe el mensaje de WhatsApp. |
| RN-13 | Antes de reservar, el cliente ve y acepta la política de multas, tolerancia y cancelación. |
| RN-14 | Sin conexión, la app lo informa y no muestra una reserva, un pago o una cotización como enviados. |
| RN-15 | Al cancelar sin reagendar, la devolución es el anticipo menos la multa (solo si cancela con menos de 4 horas) menos $2.000, y nunca baja de cero. Si reagenda, el anticipo pasa a la nueva cita. |
| RN-16 | En una no asistencia con anticipo, el sobrante (anticipo − multa) lo decide el cliente: devolución = sobrante − $2.000, mínimo 0; o reagendar dentro de 2 días con el sobrante pasado a la nueva cita. Si el sobrante es menor que el abono mínimo ($10.000), paga la diferencia hasta $10.000 para confirmar (D-05). |

## 4. Requisitos funcionales del cliente

Prioridad según MoSCoW: M (debe), S (debería), C (podría).

| ID | Requisito | Criterio de aceptación | Prior. |
|---|---|---|---|
| RF-01 | Registro e inicio de sesión | El cliente crea su cuenta con nombre, teléfono y correo, e inicia sesión; los campos se validan con mensajes específicos | M |
| RF-02 | Ver profesionales | Lista con foto, nombre y cargo; al pulsar se abre el detalle por identificador y, si no existe, se muestra un mensaje | M |
| RF-03 | Elegir servicios | Se eligen uno o varios servicios del profesional elegido; se muestran duración y total, con adicionales como la silla relajante | M |
| RF-04 | Horario por semana | Se muestra una semana a la vez con navegación a otras semanas; franjas ocupadas, pasadas, del almuerzo y días cerrados aparecen deshabilitados | M |
| RF-05 | Reservar cita | El cliente elige profesional, servicios y franja libre; una franja ocupada no se puede reservar dos veces | M |
| RF-06 | Política antes de reservar | Se muestran multa, tolerancia de 10 minutos y cancelación; sin aceptarla no se confirma | M |
| RF-07 | Aviso por WhatsApp | Al reservar o cancelar se abre WhatsApp con el mensaje prellenado hacia la barbería: cliente, profesional, servicios, fecha, hora y valor | M |
| RF-08 | Mis citas | Citas próximas y pasadas con su estado; el detalle se abre por identificador | M |
| RF-09 | Cancelar cita | Antes de confirmar se muestra la consecuencia (multa o devolución) según la regla de 4 horas | M |
| RF-10 | Cotizador de productos | Productos con foto y precio, búsqueda, contador de cantidad con límites, total calculado y envío por WhatsApp, solo o junto a la cita | M |
| RF-11 | Búsqueda y filtro | Buscar servicios y productos; resultado vacío con mensaje y carga con indicador | M |
| RF-12 | Mapa de la barbería | Marcador del local, ubicación actual del cliente y permisos manejados (sección 6) | M |
| RF-13 | Anticipo opcional | El cliente elige sin anticipo, abono o total; ve los datos de pago; sube el comprobante con cámara o galería (JPG o PNG de hasta 5 MB); ve el estado del pago | S |
| RF-14 | Reagendar cita | Una cita futura se reagenda con 4 horas o más de anticipación y una no asistida dentro de 2 días; el cliente elige una franja libre con los mismos servicios y el anticipo pasa a la nueva cita | S |
| RF-15 | Ver multa pendiente | El cliente ve su multa y por qué no puede reservar | S |

**Catálogo inicial de servicios**

El administrador lo carga y edita desde el panel. Estos valores son **datos de prueba** para el seed; el catálogo real lo ingresa el local con el CRUD (D-01). La silla relajante es un servicio adicional configurable, que solo se elige junto con un servicio principal del mismo profesional (D-02). Donde el cliente dio un rango se usa el valor mayor para calcular franjas.

| Servicio | Duración (min) | Precio (COP) | Quién lo presta |
|---|---|---|---|
| Corte clásico o moderno | 40 | 25.000 | Barberos |
| Corte con barba | 50 | 28.000 | Barberos |
| Mechas | 90 | 100.000 | Barberos |
| Rayos | 90 | 120.000 | Barberos |
| Decoloración global | 120 | 150.000 | Barberos |
| Rizos semipermanentes | 90 (aprox.) | 100.000 | Barberos |
| Mascarilla sencilla | 30 | 15.000 | Rosmery |
| Mascarilla profunda | 60 | 35.000 | Rosmery |
| Adicional silla relajante | Sin cambio | +15.000 | Rosmery |
| Uñas | Por definir | Por definir | Rosmery (supuesto) |

## 5. Requisitos funcionales del panel

El panel está integrado en la misma app y es básico pero funcional. El administrador cambia catálogos y configuración; el profesional solo consulta su agenda y marca asistencia.

| ID | Requisito | Criterio de aceptación | Prior. |
|---|---|---|---|
| RF-20 | Acceso por rol | Al iniciar sesión, administrador y profesional ven el panel; el cliente no | M |
| RF-21 | Agenda del profesional | Ve sus citas del día y de la semana, y ninguna de otros profesionales | M |
| RF-22 | Agenda del administrador | Ve las citas de todos los profesionales y filtra por profesional | M |
| RF-23 | Asistencia | El profesional marca la asistencia de sus citas y el administrador la de cualquiera, como completada o no asistida; al marcar no asistida se genera la multa | M |
| RF-24 | Días de trabajo y bloqueos | Los festivos de Colombia se identifican automáticamente (D-09); el administrador habilita domingos y festivos (10:00 a. m. a 4:00 p. m. por defecto), cambia el horario de atención de un día específico y bloquea franjas por días libres o imprevistos; lo bloqueado deja de ofrecerse al cliente y el almuerzo sigue bloqueado | M |
| RF-25 | Multas | El administrador ve las pendientes, las descuenta del anticipo, las marca como pagadas o las perdona | M |
| RF-26 | CRUD de servicios | El administrador crea, edita y desactiva servicios con nombre, descripción, duración, precio y profesionales que lo prestan | M |
| RF-27 | CRUD de productos | El administrador crea, edita y desactiva productos con nombre, descripción, categoría (cabello o barba), precio y foto | M |
| RF-28 | Comprobantes y devoluciones | El administrador ve la captura del comprobante, confirma o rechaza el anticipo y registra devoluciones con el descuento de $2.000 | S |
| RF-29 | Gestión de profesionales | El administrador crea y edita profesionales con foto, cargo y servicios | S |
| RF-30 | Recordatorio y avisos al profesional | El profesional recibe una notificación en su dispositivo 30 minutos antes de cada cita y cuando le reservan una cita nueva; la tab Avisos las lista (D-10, con expo-notifications aprobado en D-12) | S |
| RF-31 | Cita manual | El administrador registra una cita a nombre de un cliente | C |

La notificación de RF-30 se programa en el dispositivo del profesional cuando la app sincroniza sus citas, así que una cita creada con la app cerrada puede avisar tarde. Hay que probarlo en un Android real.

## 6. Requisitos de la asignatura y cómo los cubre la app

Cada requisito obligatorio de los lineamientos de Móvil II se convierte en una función del negocio. La matriz completa (requisito, función, pantalla, archivo y evidencia) se arma aparte desde el hito 1.

| Requisito de la asignatura | Cómo lo cubre la app | Relacionado |
|---|---|---|
| React Native, TypeScript y Expo con Expo Router | Proyecto con carpetas separadas para rutas y pantallas, componentes, hooks, servicios HTTP, tipos, modelos y recursos; package.json y archivo de bloqueo | Todos |
| Stack, Tabs y Drawer | Tabs por rol (cliente: Inicio, Citas, Productos y Cuenta; profesional: Mi agenda, Avisos y Perfil; administrador: Agenda, Gestión y Revisión); Stack para el flujo de reserva y los detalles; Drawer para accesos complementarios (el local, política de reservas, privacidad y cerrar sesión) | RF-02, RF-08 |
| Ruta dinámica por identificador | Servicios del profesional y detalle de cita por id, con el mensaje de estado correspondiente cuando el id no existe | RF-02, RF-08 |
| NativeWind, iconos, imágenes, fuente personalizada y áreas seguras | Identidad en blanco, negro y gris con el nombre Señorío Barber; alternativa cuando falta una foto | RF-02, RF-10 |
| Al menos tres componentes reutilizables con props tipadas | Botón, tarjeta (profesional, producto y cita) y estado de carga, error o vacío; además, selector de franja | RF-02 a RF-11 |
| Listas, tarjetas, búsqueda o filtro | Listas de profesionales, servicios, productos y citas con búsqueda y filtro, indicador de carga y resultado vacío | RF-11 |
| useState, useEffect y un hook propio | Hook useDisponibilidadSemanal: recibe profesional, servicios y semana; devuelve las franjas libres y el estado de carga | RF-04 |
| Zustand | Estado compartido entre pantallas: sesión, borrador de la reserva y carrito de cotización; los datos remotos van por TanStack Query | RF-05, RF-10 |
| Contador contextual | Cantidad de cada producto en el cotizador, de 1 a 10, que cambia el total | RF-10 |
| Cálculo contextual | Total de la cita (servicios más adicionales), abono entre $10.000 y el total, multa descontada del anticipo y devolución (anticipo menos $2.000), con validación de vacíos, valores no numéricos y negativos | RF-03, RF-13, RF-25 |
| Formulario útil con validaciones | Reserva, registro, carga del comprobante y CRUD de servicios y productos | RF-01, RF-05, RF-13, RF-26, RF-27 |
| Axios, interfaces y mapper | Servicio único con baseURL; listado y detalle de profesionales, servicios y productos; mapper de la respuesta externa al modelo interno | RF-02, RF-03, RF-10 |
| TanStack Query | Hooks con queryKey por recurso, criterio de caché, y estados de carga, error, vacío y reintento | RF-02 a RF-11 |
| Conservación de datos | Citas, multas y comprobantes en una base remota compartida, necesaria porque cliente, profesional y administrador usan dispositivos distintos; propuesta: Supabase consumido por HTTP | RF-05, RF-25 |
| OpenStreetMap, Leaflet en WebView y expo-location | Mapa con el marcador de la barbería; permiso en primer plano; botón para centrar la ubicación actual; seguimiento con activar, pausar y reanudar; manejo de permiso denegado, regreso desde ajustes, GPS apagado y fallo de carga; se libera la suscripción al salir | RF-12 |
| Uso sin conexión | Aviso claro y sin confirmaciones falsas | RN-14 |
| Entrega | Instrucciones para ejecutar en Android (o APK), README, .env.template, informe, bitácora y prueba con el cliente | Hitos 1 a 4 |

## 7. Mapa de pantallas y navegación

Rutas de Expo Router según el mockup del equipo (22 pantallas). El cliente navega con cuatro tabs, el profesional con tres y el administrador con tres; los flujos usan Stack. Aunque el mockup no lo dibuja, cada rol tiene un Drawer que envuelve sus Tabs (Drawer › Tabs › Stack) con El local, Política de reservas, Privacidad y Cerrar sesión; Política y Privacidad también aparecen en la tab Cuenta del cliente y en el Perfil del profesional (D-16). Al abrir la app se muestra el inicio de sesión y después cada rol llega a su primera tab. "Olvidé mi contraseña" no se implementa (D-14).

| Pantalla del mockup | Ruta | Navegador | Rol | Requisitos |
|---|---|---|---|---|
| Inicio de sesión (El cuidado tiene su lugar) | /login | Stack | Todos | RF-01 |
| Registro (Hagamos la presentación) | /registro | Stack | Cliente | RF-01 |
| Inicio (Hola, Santiago) | /(tabs)/inicio | Tab | Cliente | RF-08, RF-12 |
| Elegir profesional (Manos que conoces) | /reservar | Stack | Cliente | RF-02, RF-11 |
| Elegir servicios (Tu visita, a tu medida) | /reservar/[profesionalId] | Stack (ruta dinámica) | Cliente | RF-03 |
| Horario semanal (Un espacio para ti) | /reservar/horario | Stack | Cliente | RF-04 |
| Resumen y política (Todo en su lugar) | /reservar/resumen | Stack | Cliente | RF-05, RF-06 |
| Cita registrada (Nos vemos en la silla) | /reservar/confirmacion | Stack | Cliente | RF-07 |
| Mis citas (Tu tiempo reservado) | /(tabs)/citas | Tab | Cliente | RF-08 |
| Detalle de cita (Tu próxima visita) | /cita/[id] | Stack (ruta dinámica) | Cliente | RF-08 |
| Cancelar cita (Antes de cancelar) | /cita/[id]/cancelar | Stack | Cliente | RF-09 |
| Reagendar cita (Cambiamos el momento) | /cita/[id]/reagendar | Stack | Cliente | RF-14 |
| Anticipo (A tu ritmo, también el pago) | /cita/[id]/anticipo | Stack | Cliente | RF-13 |
| Comprobante (Recibido para revisión) | /cita/[id]/comprobante | Stack | Cliente | RF-13 |
| Productos (El cuidado sigue en casa) | /(tabs)/productos | Tab | Cliente | RF-10, RF-11 |
| Cotización (Tu selección para llevar) | /cotizacion | Stack | Cliente | RF-10 |
| El local (Aquí empieza la visita) | /mapa | Stack y Drawer | Todos | RF-12 |
| Cuenta (Tu espacio personal) | /(tabs)/cuenta | Tab | Cliente | RF-15 |
| Mi agenda (Buen día, Mario) | /panel/mi-agenda | Tab | Profesional | RF-21, RF-23, RF-30 |
| Agenda del local (El local, en orden) | /panel/agenda | Tab | Administrador | RF-22, RF-23, RF-24 |
| Gestión (Lo que ofrece el local) | /panel/gestion | Tab | Administrador | RF-26, RF-27, RF-29 |
| Revisión (Revisar y resolver) | /panel/revision | Tab | Administrador | RF-25, RF-28 |

El Drawer muestra solo las entradas que corresponden al rol de quien inició sesión. Un id inexistente en cualquier ruta dinámica muestra el mensaje de la biblioteca de estados del mockup ("Profesional no encontrado", "No encontramos esta cita"). Faltan por dibujar las tabs Avisos y Perfil del profesional (contenido en D-10 y D-11) y las pestañas Productos y Profesionales de Gestión. Los estados de cita, anticipo y multa están en D-15.

## 8. Alcance del MVP

El MVP del 19 de noviembre incluye todos los requisitos M y S de las secciones 4 y 5. Los marcados C solo se hacen si sobra tiempo.

**Dentro del MVP**

- Registro, profesionales, servicios, horario semanal, reserva con varios servicios y cancelación.
- Avisos por WhatsApp con enlace prellenado hacia el 3189773741.
- Multas, tolerancia de 10 minutos y reagendamiento de citas no asistidas.
- Anticipo opcional con comprobante y confirmación del administrador.
- Cotizador con carrito, solo para cotizar productos y enviar la cotización por WhatsApp.
- Mapa de la barbería con ubicación actual.
- Panel: agenda, días de trabajo, multas, CRUD de servicios y productos, comprobantes y recordatorio al profesional.

**Fuera del MVP**

- Pago con tarjeta y pago de productos dentro de la app: posible en una segunda versión.
- Envío automático de WhatsApp con la API oficial.
- Seguimiento en segundo plano, rutas y navegación giro a giro (los lineamientos no lo exigen).
- Crear citas manualmente desde el panel (C), reportes, reseñas, fidelización y varias sucursales.
- Publicación en tiendas: se entrega un instalador para Android o instrucciones completas con Expo.

## 9. Cronograma por hitos

Quedan 13 días desde hoy (6 de noviembre) hasta la entrega del 19 de noviembre de 2026. Los cuatro hitos son los de los lineamientos; como el docente no fijó fechas, se reparten aquí. El proyecto lo desarrolla una sola persona (D-34). Las funciones M se congelan el **17 de noviembre de 2026 a las 6:00 p. m.** (hora de Bogotá, D-34): después de esa hora solo se corrigen fallos, se prueba y se documenta.

| Fechas | Hito | Qué se demuestra |
|---|---|---|
| 6 – 8 nov | 1. Definición y base | SRS v2, mockup, matriz de requisitos, proyecto Expo ejecutable con Expo Router y primeras rutas, tablas y datos de prueba en la base remota |
| 9 – 12 nov | 2. Interfaz y lógica | Stack, Tabs y Drawer conectados; componentes con props; contador; cálculo; formularios; Zustand |
| 13 – 17 nov | 3. Datos y ubicación | Axios, tipos, mapper, hooks y TanStack Query; disponibilidad semanal; mapa, GPS y permisos; funciones M terminadas antes del 17 nov a las 6:00 p. m. |
| 18 – 19 nov | 4. Integración y ajustes | Proceso completo, multas, comprobantes, recordatorio, pruebas de fallos, prueba con el cliente, README, informe e instalador Android |

**Orden de recorte (D-34).** Si el tiempo no alcanza, se deja fuera en este orden y se documenta como límite conocido:

1. RF-30, recordatorio y avisos al profesional.
2. RF-29, gestión de profesionales (el rol se sigue asignando con `asignar_rol` desde el SQL Editor).
3. El caso de cita no asistida de RF-14 (RN-16, D-05). Reagendar una cita futura se mantiene.
4. Las devoluciones de RF-28. Aprobar o rechazar el comprobante se mantiene.
5. RF-31, cita manual.

**Riesgos**

| Riesgo | Mitigación |
|---|---|
| Una sola persona, nueva en React, con el panel dentro del plazo | Seguir el orden de recorte de D-34 antes de tocar un requisito M |
| Cálculo de franjas con varios servicios, almuerzo y días habilitados | Una sola función de disponibilidad con pruebas desde el hito 2 |
| Dos clientes reservan la misma franja | Restricción única en la base de datos |
| Recordatorio al profesional no llega con la app cerrada | Probar en un Android real desde el hito 3; si falla, mostrarlo dentro de la agenda |
| Faltan datos del cliente (dirección, fotos, uñas) | Trabajar con datos de prueba y reemplazarlos al recibirlos |
| Solo 13 días para todo el alcance | Congelar funciones el 17 de nov a las 6:00 p. m. (D-34); lo que no esté listo se recorta en el orden de D-34 y se documenta como límite conocido |

## 10. Pendientes por confirmar

**Con el cliente**

- ☑ Catálogo de servicios, uñas y productos: lo carga el local con el CRUD; se usan datos de prueba (D-01).
- ☑ Coordenadas de la barbería: 4.812879019062988, -75.70027155767009 (D-03).
- ☑ Datos de pago de Nequi, Bold y Bancolombia (D-04).
- ☐ Dirección, logo y fotos de profesionales, servicios y productos: se reciben para el diseño.
