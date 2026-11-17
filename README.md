# Señorío Barber: app móvil de reservas

Proyecto final de Móvil II. Los clientes de la barbería Señorío reservan una cita con un profesional por semana, pagan un anticipo opcional subiendo el comprobante, cancelan o reagendan según la política del local, cotizan productos por WhatsApp y ven el local en un mapa. El profesional ve su agenda, marca la asistencia y recibe avisos. El administrador gestiona la agenda del local, los días de trabajo, el catálogo, los profesionales, las multas, los comprobantes y las devoluciones.

- Requisitos y reglas: [docs/SRS.md](docs/SRS.md) (RF, RN y pantallas) y [docs/decisiones.md](docs/decisiones.md) (D-xx).
- Estado de cada requisito: [docs/estado.md](docs/estado.md).
- Informe, matriz de requisitos y bitácora: [docs/informe.md](docs/informe.md), [docs/matriz-requisitos.md](docs/matriz-requisitos.md) y [docs/bitacora.md](docs/bitacora.md).
- Prueba con el cliente y guion de la sustentación: [docs/prueba-cliente.md](docs/prueba-cliente.md) y [docs/sustentacion.md](docs/sustentacion.md).

## Tecnologías

React Native 0.88 con Expo SDK 58 y TypeScript estricto, Expo Router (Stack, Tabs y Drawer), NativeWind, Zustand, TanStack Query, Axios, Supabase (REST, RPC, Auth y Storage por HTTP, sin SDK), react-native-webview con Leaflet y OpenStreetMap, expo-location, expo-notifications, expo-secure-store, expo-image-picker y expo-image. Las versiones exactas están en `package.json` y `package-lock.json`.

## Requisitos

- Node.js 22 LTS (22.18 o más nuevo) y npm.
- Un teléfono Android con **Expo Go** para el SDK 58 (Play Store), en la misma red wifi que el computador. También sirve un emulador de Android Studio.
- Un proyecto de [Supabase](https://supabase.com) (el plan gratuito alcanza).
- Solo para generar el APK: una cuenta gratuita de [Expo](https://expo.dev) y EAS CLI (`npm install -g eas-cli`).

## Instalación

```bash
npm install
```

```bash
cp .env.template .env
```

## Configuración

La app solo lee dos variables, las dos públicas (`src/config/env.ts`). Completa `.env`:

| Variable | Qué es | De dónde sale |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto, sin barra al final | Supabase > Project Settings > API > Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon (o publishable, `sb_publishable_…`) | Supabase > Project Settings > API > anon public |

- Las variables `EXPO_PUBLIC_*` viajan dentro de la app instalada: no son secretos. Lo que protege los datos es la RLS de cada tabla.
- Nunca pongas la service_role key: la app no la necesita (D-13). `.env` está en `.gitignore`.
- Sin estos valores, las pantallas con datos muestran un error de configuración.
- WhatsApp, dirección, coordenadas, horarios, multa, tolerancia y límites del cotizador no son variables de entorno: viven en `src/config/negocio.ts`.

## Base de datos (Supabase)

La app consume Supabase por HTTP con Axios: la REST API (`/rest/v1`) y las funciones RPC para leer y escribir, Auth (`/auth/v1`) para la sesión y Storage para los comprobantes y las fotos. Las instancias de Axios están en `src/services/api/` (`supabase-api.ts` y `auth-api.ts`); la URL base sale de `.env`.

1. En el **SQL Editor** de Supabase ejecuta, en este orden, cada archivo de `supabase/migrations/`:

   1. `20261114120000_catalogo.sql`
   2. `20261115120000_reservas_y_roles.sql`
   3. `20261116120000_cancelar_cita.sql`
   4. `20261117120000_comprobantes_reemplazo.sql`
   5. `20261117180000_agenda_profesional.sql`
   6. `20261117200000_festivos_hasta_2030.sql`
   7. `20261117220000_revision_comprobantes.sql`
   8. `20261117230000_gestion_catalogo.sql`
   9. `20261117235000_reagendar_cita.sql`
   10. `20261118000000_gestion_profesionales.sql`
   11. `20261118010000_notificaciones.sql`

   Crean las tablas, la RLS, las funciones (`reservar_cita`, `cancelar_cita`, `reagendar_cita`…), los triggers, los festivos hasta 2030 y los buckets `comprobantes` (privado) y `fotos` (público). Con la CLI de Supabase equivale a `supabase db push`.
2. Ejecuta `supabase/seed.sql`: carga profesionales, servicios y productos de prueba (D-01). Se puede repetir sin duplicar.
3. En Authentication > Sign In / Providers > Email, **desactiva "Confirm email"** (D-25): así el registro entra directo.

### Cuentas de prueba

En el proyecto de Supabase de la entrega ya existe una cuenta por rol. Son **desechables y solo para pruebas**: usan el dominio `.test`, que no recibe correo, y no contienen datos reales. Las contraseñas no van en el repositorio (D-23, D-51); se entregan al docente por fuera.

| Rol | Correo | Qué permite probar |
|---|---|---|
| Administrador | `admin@senorio.test` | Agenda del local, días de trabajo y bloqueos, Gestión (servicios, productos, profesionales), Revisión (comprobantes, multas, devoluciones) |
| Profesional | `mario@senorio.test` | Mi agenda, marcar asistencia, Avisos y recordatorios |
| Cliente | `laura@senorio.test` | Reservar, Citas (anticipo, cancelar, reagendar), Productos y cotización, Cuenta |

En un proyecto de Supabase nuevo, las cuentas no van en el seed, para no guardar contraseñas en el repositorio (D-13, D-23). Créalas así:

1. Registra en la app tres cuentas: una para el administrador, una para un profesional y una para un cliente.
2. Convierte la primera en administrador una sola vez desde el SQL Editor:

   ```sql
   update public.perfiles set rol = 'administrador' where correo = 'correo-del-admin@ejemplo.com';
   ```

3. Entra con el administrador, ve a Gestión > Profesionales, edita una ficha (por ejemplo Mario) y vincúlale la cuenta del profesional (RF-29). Si la persona tenía la sesión abierta, debe cerrarla y volver a entrar.
4. Opcional: `supabase/pruebas/citas_de_prueba.sql` deja citas listas para probar la asistencia, la multa y el comprobante (lee sus comentarios antes de ejecutarlo).

## Ejecutar en Android

```bash
npx expo start
```

Escanea el código QR con Expo Go. Si el teléfono no encuentra el computador (redes con aislamiento de clientes), usa `npx expo start --tunnel`. Con un emulador abierto, pulsa `a` en la terminal.

Las notificaciones de Expo Go salen con el ícono de Expo Go; el ícono propio solo aparece en un APK (D-47).

## Generar el APK (instalador para Android)

`eas.json` tiene el perfil `apk`, que compila en la nube de Expo un `.apk` instalable sin el computador ni Expo Go. El paquete de Android es `com.senoriobarber.app` (`app.json`).

`.env` no se sube al build (está en `.gitignore`), así que las dos variables se cargan una vez en el entorno `preview` de EAS, que es el que usa el perfil `apk`:

```bash
eas login
```

```bash
eas init
```

```bash
eas env:set --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://TU-PROYECTO.supabase.co --visibility plaintext
```

```bash
eas env:set --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value TU_CLAVE_ANON --visibility plaintext
```

```bash
eas build -p android --profile apk
```

`eas init` vincula el proyecto con tu cuenta de Expo (agrega `extra.eas.projectId` a `app.json`; súbelo a git). La primera vez, el build pregunta si genera la keystore de Android: responde que sí. Al terminar, la terminal muestra un enlace y un QR: ábrelo en el teléfono, descarga el `.apk` e instálalo (Android pide permitir instalar apps de esa fuente). En el APK las notificaciones salen con el ícono propio (D-47).

## Probar el proceso principal

Con la cuenta del **cliente**:

1. Inicio > Reservar: elige un profesional, uno o más servicios (el total y la duración se suman) y una franja de la semana. Las ocupadas y el almuerzo no se ofrecen.
2. Resumen: acepta la política y confirma. La confirmación vuelve a leer la cita de la base; "Avisar por WhatsApp" abre WhatsApp con el mensaje escrito.
3. Citas > la cita: "Pagar anticipo". Escribe un abono (prueba vacío, letras, `-5000`, `9.999` y uno mayor que el total para ver cada mensaje), elige el medio y sube una imagen. Queda "Recibido para revisión" y aún no cuenta como pagado.
4. Productos: agrega productos, ajusta cantidades de 1 a 10 y abre la cotización por WhatsApp.
5. Cierra la app por completo y vuelve a abrirla: la sesión se restaura y la cita sigue en Citas (la guarda Supabase).
6. Desde la cita, prueba Reagendar y Cancelar (con 4 h o más, o menos, para ver la multa).
7. Drawer > El local: concede el permiso, centra tu ubicación y activa, pausa y reanuda el seguimiento.

Con la cuenta del **administrador**: Revisión > Comprobantes, confirma el anticipo (el cliente lo ve como pagado); Agenda, mira la cita del día; Agenda > Días laborables, habilita un domingo; Gestión, crea o edita un servicio.

Con la cuenta del **profesional**: Mi agenda, marca "Asistió" o, pasados 10 minutos de la hora, "No asistió" (genera la multa); Avisos, activa las notificaciones.

Sin conexión (modo avión) las pantallas dicen "Sin conexión", conservan lo elegido y se recuperan solas al volver la red.

## Pruebas y verificación

```bash
npx tsc --noEmit
```

```bash
npx jest
```

Las pruebas de Jest cubren la lógica de `src/lib` (disponibilidad, festivos, dinero, cancelación, reagendar, cotización…), los mappers de `src/models` y algunos servicios y stores. Las reglas de la base se comprueban con los archivos de `supabase/pruebas/`: se pegan en el SQL Editor, corren dentro de `begin … rollback` (no dejan datos) y terminan con una fila `ok` o con el error `Falla …`.

## Conservación de los datos

- Citas, anticipos, comprobantes, multas, devoluciones, catálogo, días de trabajo y avisos se guardan en **Supabase (PostgreSQL)**: se comparten entre teléfonos y siguen ahí al cerrar y abrir la app. La app solo muestra algo como guardado cuando la base lo confirmó (RN-12).
- La sesión (tokens y perfil) se guarda en el teléfono con **expo-secure-store** y se restaura al abrir la app.
- Zustand guarda el estado de pantalla compartido (borrador de la reserva, bolsa de la cotización, ubicación, permisos): vive en memoria y se pierde al cerrar la app, a propósito. TanStack Query es solo una caché de lo remoto.

## Organización del código

```text
src/app/          rutas de Expo Router (delgadas)
src/components/   componentes reutilizables y cuerpo de cada pantalla (components/pantallas)
src/hooks/        hooks de TanStack Query y hooks propios (useDisponibilidadSemanal…)
src/store/        stores de Zustand
src/services/     Axios (services/api) y acciones por recurso (*.api.ts)
src/models/       mappers de la respuesta de Supabase al modelo de la app
src/types/        tipos de entidades, API y resultados
src/lib/          lógica de negocio pura, con pruebas
src/config/       parámetros del negocio (negocio.ts) y variables de entorno (env.ts)
supabase/         migraciones, seed y pruebas SQL
```

## Límites conocidos

- No hay push desde un servidor: el aviso de "Cita nueva" llega con la app abierta o al volver a ella; el recordatorio de 30 minutos sí suena con la app cerrada (D-10, D-47, D-48).
- La app no cobra: el anticipo se paga por fuera (Nequi, Bold o Bancolombia) y el administrador confirma el comprobante. La cotización de productos es solo por WhatsApp.
- Las fotos reemplazadas del catálogo y un comprobante cuyo registro falla después de subir quedan en Storage (D-38, D-43).
- Faltan las fotos reales del cliente (D-03) y el catálogo es de prueba (D-01). La dirección (Cra. 10 #25B-81, Pereira, Risaralda) y el logo (`assets/images/logo.png`) ya están confirmados (D-51, D-52).
- Varias reglas que el SRS no fijaba son suposiciones del equipo aún sin confirmar con el cliente; están en `docs/informe.md` §10 y en `docs/decisiones.md`.
