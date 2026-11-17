# Informe del proyecto final: Señorío Barber

Móvil II · React Native, TypeScript y Expo · Entrega del 19 nov 2026 · Desarrollo individual (D-34).

## 1. Cliente y problema

| Tema | Descripción |
|---|---|
| Cliente | Señorío Barber, barbería y manicura. Cra. 10 #25B-81, Pereira, Risaralda |
| Usuario principal | El cliente que reserva una cita |
| Cómo se hace hoy | Las citas se coordinan una a una por WhatsApp y a mano; las multas y la tolerancia se aplican de memoria |
| Cómo se hace con la app | El cliente elige profesional, servicios y una franja libre de la semana, acepta la política y reserva; puede pagar un anticipo subiendo el comprobante; el local recibe el aviso por WhatsApp y gestiona agenda, asistencia, multas y comprobantes desde el panel |
| Beneficio | Reservas sin coordinación manual, agenda visible por profesional y reglas de multa, tolerancia y devolución aplicadas igual para todos |

## 2. Alcance

**Proceso principal:** reservar una cita de principio a fin (RF-02 a RF-08) contra una base remota real.

**Funciones complementarias:** cotizador de productos con contador por WhatsApp (RF-10, RF-11); cancelar, reagendar y anticipo con comprobante (RF-09, RF-13, RF-14); mapa del local con la ubicación del dispositivo (RF-12); panel del profesional (agenda, asistencia, avisos) y del administrador (agenda del local, días de trabajo, catálogo, profesionales, multas, comprobantes y devoluciones) (RF-20 a RF-30).

**Fuera de alcance:** pagos dentro de la app, API oficial de WhatsApp, push desde un servidor, seguimiento en segundo plano, rutas, reportes, reseñas y varias sucursales. RF-31 (cita manual) quedó solo en la base (D-34). "Olvidé mi contraseña" no se construye (D-14). Los cambios de alcance están en `docs/decisiones.md`.

## 3. Reglas de negocio

El detalle está en el SRS §3 (RN-01 a RN-16) y en las decisiones D-xx. Los parámetros viven en `src/config/negocio.ts` y, donde la base valida, también en las migraciones (D-23).

- Horario: lunes a jueves 9:00 a 19:30; viernes y sábado 9:00 a 20:30; domingos y festivos cerrados salvo que el administrador los habilite (10:00 a 16:00); almuerzo 12:00 a 13:00 sin citas. Festivos de Colombia calculados con `festivosColombia`.
- Franjas cada 15 minutos; la duración y el precio de la cita son la suma de sus servicios y adicionales. La base impide la doble reserva con `EXCLUDE USING gist`.
- Tolerancia de 10 minutos; después la cita se ve "Por marcar" y el profesional la marca. Multa de $10.000 por no asistir o cancelar con menos de 4 h; sin anticipo, la multa pendiente bloquea reservas nuevas.
- Anticipo opcional entre $10.000 y el total; cuenta como pagado solo cuando el administrador aprueba el comprobante.
- Cancelar con 4 h o más y reagendar traslada el anticipo; sin reagendar, devolución = anticipo − $2.000 (mínimo 0); tarde, anticipo − multa − $2.000.
- Cotización de 1 a 10 unidades por producto, solo por WhatsApp.
- La base es la fuente de verdad: nada se muestra como guardado, enviado o pagado sin su respuesta (RN-12); sin conexión se avisa y se conserva lo elegido (RN-14).

## 4. Mapa de pantallas

Navegación Drawer › Tabs › Stack (D-16, D-22). Un solo Drawer muestra la sección del rol, El local, Política, Privacidad y Cerrar sesión.

- **Cliente** (tabs Inicio, Citas, Productos y Cuenta): `/reservar` → `/reservar/[profesionalId]` → `/reservar/horario` → `/reservar/resumen` → `/reservar/confirmacion`; `/citas` → `/cita/[id]` → `cancelar`, `reagendar`, `anticipo`, `comprobante`; `/productos` → `/cotizacion`; `/cuenta`.
- **Profesional** (tabs Mi agenda, Avisos y Perfil).
- **Administrador** (tabs Agenda, Gestión y Revisión): `/panel/agenda` → `dias`, `horario-dia`, `bloqueos`, `bloqueo-nuevo`; `/panel/gestion` → `servicio`, `producto`, `profesional`; `/panel/revision`.
- **Todos:** `/login`, `/registro`, `/mapa`, `/politica`, `/privacidad`.

Las rutas dinámicas `/reservar/[profesionalId]` y `/cita/[id]` muestran "Profesional no encontrado" o "No encontramos esta cita" con un botón que navega cuando el id no existe. La tabla completa está en el SRS §7.

## 5. Organización del código

| Carpeta | Contenido |
|---|---|
| `src/app/` | Solo rutas de Expo Router, delgadas: importan el cuerpo de `components/pantallas` |
| `src/components/` | Componentes reutilizables (`Boton`, `Tarjeta`, `CampoTexto`, `EstadoPantalla`, `SelectorFranja`, `FormularioConTeclado`…) y pantallas |
| `src/hooks/` | Hooks de TanStack Query por recurso y hooks propios |
| `src/store/` | Stores de Zustand |
| `src/services/` | Axios (`api/supabase-api.ts`, `api/auth-api.ts`) y acciones por recurso (`*.api.ts`) |
| `src/models/` | Mappers de la respuesta de Supabase al modelo interno, con pruebas |
| `src/types/` | Entidades, respuestas de API y resultados |
| `src/lib/` | Lógica de negocio pura con pruebas |
| `src/config/` | `negocio.ts` (parámetros) y `env.ts` (variables de entorno) |
| `supabase/` | Migraciones, seed y pruebas SQL |

## 6. Piezas técnicas

**Hook propio `useDisponibilidadSemanal`** (`src/hooks/useDisponibilidadSemanal.ts`), usado en el horario de la reserva y en reagendar.

- Entradas: profesional, duración de la cita (la suma de sus servicios), lunes de la semana y, al reagendar, la cita actual para no contarla como ocupada.
- Estado y efecto: una consulta de TanStack Query con `queryKey ['disponibilidad', profesionalId, lunes]` trae de Supabase lo ocupado, los festivos y los días especiales; `useMemo` recalcula con `calcularSemana` (función pura de `src/lib/disponibilidad.ts`) cuando cambian los datos o la duración. La duración no va en la queryKey: cambiar de servicios recalcula sin volver a pedir.
- Resultado: siete días con sus franjas, `cargando`, `error` y `reintentar`.

**Zustand frente a TanStack Query.** Zustand guarda estado de la interfaz que comparten varias pantallas y que no vive en el servidor: la sesión (`useSesionStore`), el borrador de la reserva entre los pasos del Stack (`useReservaStore`), la bolsa de la cotización (`useCarritoStore`), la ubicación y la suscripción del GPS (`useUbicacionStore`) y los permisos. TanStack Query guarda copias en caché de datos remotos (profesionales, citas, agenda, revisión…), sabe cuándo están viejos, los vuelve a pedir y se invalida tras cada escritura. Ningún dato remoto se copia a Zustand.

**Mapper.** `src/models/profesional.mapper.ts` convierte `ProfesionalRespuesta` (snake_case, `foto_url` nula o vacía, servicios embebidos por PostgREST, también los inactivos) en el modelo `Profesional` o `ProfesionalDetalle`: `foto` queda `null` para que `Tarjeta` muestre la imagen de reemplazo, el cargo nulo pasa a "Profesional" y solo se dejan los servicios activos. Las pruebas están en `src/models/__tests__/`.

**queryKey y criterio de caché.** Cada recurso tiene su clave jerárquica: `['profesionales']`, `['profesional', id]`, `['productos']`, `['citas', 'mias', clienteId]`, `['citas', 'detalle', id]`, `['citas', 'agenda', profesionalId, desde, hasta]`, `['disponibilidad', profesionalId, lunes]`… Así, una escritura invalida todo lo que depende de ella con un prefijo (reservar y reagendar invalidan `['citas']` y `['disponibilidad']`, lo que refresca Mis citas, el detalle, la agenda y las franjas). El `staleTime` depende de cuánto cambia el dato: 5 minutos para el catálogo, 1 minuto para el detalle de una cita y 30 segundos para franjas, agenda y revisión. Una consulta con error se reintenta cada 15 s mientras su pantalla está abierta y, al volver la app a primer plano, se refresca lo viejo (D-49).

**Conservación de datos.** Reservas, anticipos, comprobantes, multas, devoluciones, catálogo, días de trabajo y avisos se guardan en Supabase (PostgreSQL), compartido por el cliente, el profesional y el administrador desde teléfonos distintos. La sesión se guarda con `expo-secure-store` y se restaura al abrir. Límite: el borrador de la reserva y la bolsa de cotización se pierden al cerrar la app (Zustand en memoria, a propósito); los recordatorios programados viven solo en el teléfono del profesional.

**Cálculo y contador.** `validarAbono` (`src/lib/finanzas.ts`) recibe lo escrito, el total de la cita y lo trasladado; rechaza vacío ("Ingresa un valor."), no numérico ("Usa solo números, por ejemplo 20.000."), negativo ("El valor no puede ser negativo."), menos de $10.000 y más del total. `limitarCantidad` (`src/lib/cantidad.ts`) deja cada producto entre 1 y 10, y los botones − y + se deshabilitan en los límites.

## 7. Matriz de requisitos

Ver [docs/matriz-requisitos.md](matriz-requisitos.md): requisito, función, pantalla, archivo, evidencia y estado. El estado de cada RF y RN está en [docs/estado.md](estado.md).

## 8. Evidencias de pruebas

- `npx tsc --noEmit` sin errores y `npx jest` en verde: **28 suites y 306 pruebas** (corte del 17 nov 2026, rama `chore/p15-entrega`). Cubren disponibilidad, festivos, dinero, cancelación, reagendar, cotización, búsqueda, navegación por rol, reconexión, recordatorios, mappers, el permiso de notificaciones y la suscripción del GPS.
- Pruebas SQL en `supabase/pruebas/` contra la base real, dentro de `begin … rollback`: cancelación, comprobantes, asistencia, revisión, gestión, profesionales y notificaciones con `ok`; `reagendar.sql` y `dias_trabajo.sql` se corrigieron y falta volver a correrlas.
- Prueba en un Android real: pendiente para la mayoría de funciones; los pasos están en el README. El APK se genera con `eas build -p android --profile apk` (README, Generar el APK).
- Fallos provocados a mano durante el desarrollo y su corrección: formulario borrado al quitar y poner el wifi (D-49), suscripción del GPS viva al salir del mapa mientras arrancaba (D-50, con prueba), imagen del comprobante que Expo Go no leía (D-38), canal de notificaciones que fallaba en Expo Go (D-47) y citas de prueba que chocaban en la base (D-50).

## 9. Prueba con el cliente

Pendiente. Se registra en [docs/prueba-cliente.md](prueba-cliente.md) con la plantilla de ese archivo: tarea solicitada, resultado, dificultades observadas y al menos un ajuste hecho por su retroalimentación, sin datos personales innecesarios (solo el rol de la persona, no su nombre ni su teléfono). Al terminar, se copia aquí el resumen y el ajuste derivado.

## 10. Límites conocidos

- Sin push: el aviso de cita nueva llega con la app abierta o al volver a ella; el recordatorio de 30 minutos sí suena con la app cerrada (D-10, D-47, D-48).
- Para el cliente, un bloqueo del profesional se ve igual que una cita: "Ocupada" (D-24).
- Fotos reemplazadas y comprobantes cuyo registro falló quedan en Storage (D-38, D-43).
- Un cambio de rol exige cerrar sesión y volver a entrar (D-46).
- Del cliente ya está la dirección (Cra. 10 #25B-81, Pereira, Risaralda, D-51); el logo de `assets/images/logo.png` está confirmado y es el del ícono y el splash (D-52); faltan las fotos reales y el catálogo es de prueba (D-01, D-03). Las coordenadas del mapa son las que dio el cliente (D-03), no se calcularon desde la dirección.
- APK: `eas.json` tiene el perfil `apk`, pero el instalador aún no se ha generado ni probado; mientras tanto la app corre con Expo Go y el servidor de desarrollo (README).

**Lo recortado (orden de D-34).** RF-31, cita manual del administrador, solo existe en la base (`reservar_cita` acepta `p_cliente_id`), sin pantalla. Los demás puntos del orden de recorte (RF-30, RF-29, la no asistencia de RF-14 y las devoluciones de RF-28) sí alcanzaron. "Olvidé mi contraseña" no se construye (D-14).

**Avisos sin push (D-10).** No hay servidor que envíe notificaciones push. El aviso de "Cita nueva", "reagendada" o "cancelada" se guarda en la base y el teléfono del profesional lo muestra cuando la app sincroniza: con la app abierta (cada minuto) o al volver a ella. El recordatorio de 30 minutos sí suena con la app cerrada, porque lo programa el propio teléfono; "Forzar detención" o un ahorro de batería agresivo pueden borrarlo (D-47, D-48).

**Decisiones del equipo sin confirmar con el cliente.** El SRS no las fijaba y se tomaron como suposición (detalle en `docs/decisiones.md`). Conviene revisarlas en la prueba con el cliente:

| Decisión | Qué se supuso |
|---|---|
| D-24 | Sin antelación mínima: una franja que empieza ahora mismo se puede reservar. Un bloqueo del profesional se ve "Ocupada", igual que una cita |
| D-25 | El registro pide nombre, celular colombiano y contraseña; la confirmación por correo está desactivada |
| D-35 | El código visible de la cita es `SB-` + 6 caracteres de su id |
| D-36 | La bolsa de la cotización cuenta unidades, no productos distintos |
| D-38 | Medios de pago del anticipo: Nequi, Bold o Bancolombia; comprobante JPG o PNG de hasta 5 MB |
| D-39 | La agenda del profesional no muestra las citas canceladas ni las reagendadas |
| D-42 | Revisión del administrador en tres pestañas: Comprobantes, Multas y Devoluciones |
| D-44 | El cliente edita solo su nombre y su teléfono, en la misma pantalla Cuenta |
| D-45 | Reglas finas de reagendar y del anticipo trasladado |
| D-46 | Desactivar a un profesional lo oculta al cliente pero no cancela sus citas |
| D-47 | Además de "cita nueva", el profesional recibe aviso de cita reagendada y cancelada |
