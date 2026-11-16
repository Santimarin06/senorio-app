# Patrones de clase en Señorío Barber

Guía para la sustentación: qué se tomó de cada proyecto de clase, dónde quedó en este repositorio y qué se corrigió.

| Proyecto de clase | Qué enseña |
|---|---|
| 06-Peliculas | Axios con baseURL, acciones `get*`, tipos de la API frente al modelo interno, mapper, hooks con TanStack Query y NativeWind |
| Mapas | Leaflet en WebView, expo-location, permisos, AppState y Zustand |
| navegation-app | Drawer › Tabs › Stack con Expo Router, ruta dinámica, `CustomButton` y fuentes |

## Flujo de datos remotos (06-Peliculas)

```
supabase-api.ts (axios) → profesionales.api.ts (getProfesionales) → profesional.mapper.ts (mapProfesional)
  → useProfesionales.ts (useQuery) → pantalla → Tarjeta / EstadoPantalla
```

| En clase | Aquí |
|---|---|
| `services/api/movie-api.ts` | [src/services/api/supabase-api.ts](../src/services/api/supabase-api.ts): único servicio con baseURL; headers `apikey` y `Authorization` con la anon key |
| `features/movies/api/movie.api.ts` (`getMovieById`) | [src/services/profesionales.api.ts](../src/services/profesionales.api.ts) (`getProfesionales`, `getProfesionalById`), [productos.api.ts](../src/services/productos.api.ts) |
| `features/movies/types/tmdb.ts` (`TMDBMovie`) | [src/types/api.ts](../src/types/api.ts) (`ProfesionalRespuesta`, snake_case) |
| `services/types/movie.ts` (`Movie`) | [src/types/entidades.ts](../src/types/entidades.ts) (`Profesional`, camelCase) |
| `movie.mapper.ts` (`mapTMDBMovie`) | [src/models/profesional.mapper.ts](../src/models/profesional.mapper.ts), [servicio.mapper.ts](../src/models/servicio.mapper.ts), [producto.mapper.ts](../src/models/producto.mapper.ts) |
| `useMovie(id)` con `queryKey: ['movie', id]` | [src/hooks/useProfesionales.ts](../src/hooks/useProfesionales.ts) con `['profesionales']` / `['profesional', id]` y `staleTime` de 5 min; [useProductos.ts](../src/hooks/useProductos.ts) con 1 h |
| `QueryClient({ retry: 2, refetchOnWindowFocus: false })` | Igual en [src/app/_layout.tsx](../src/app/_layout.tsx) |
| babel, metro y tailwind de NativeWind 4 + Tailwind 3 | Copiados en la raíz; paleta blanco, negro y gris y fuentes `font-titulo` / `font-texto` |

**Corregido:** en clase no había botón de reintentar. Aquí toda pantalla remota usa [EstadoPantalla](../src/components/EstadoPantalla.tsx) (carga, error con Reintentar, vacío), y [errores.ts](../src/lib/errores.ts) distingue "sin conexión" de un error del servidor (RN-14). Un id que no es uuid devuelve `null` sin llamar a la base, así que se muestra "Profesional no encontrado".

## Navegación (navegation-app)

```
src/app/_layout.tsx            Stack raíz (fuentes, splash, QueryClientProvider)
├── index.tsx                  Redirect a /login
├── login.tsx, registro.tsx
└── (app)/_layout.tsx          Drawer único con CustomDrawer: sección del rol, El local, Política, Privacidad, Cerrar sesión (D-22)
    ├── mapa.tsx, politica.tsx, privacidad.tsx
    ├── (cliente)/_layout.tsx  Tabs del cliente: Inicio, Citas, Productos, Cuenta
    │   ├── (inicio)/…         Stack: inicio, reservar/index, reservar/[profesionalId], horario, resumen, confirmacion
    │   └── (citas)/…  (productos)/…  (cuenta)/…   un Stack por tab
    └── panel/
        ├── (profesional)/_layout.tsx     Tabs: Mi agenda, Avisos, Perfil
        └── (administrador)/_layout.tsx   Tabs: Agenda, Gestión, Revisión
```

| En clase | Aquí |
|---|---|
| `(drawer)/_layout.tsx` con `Drawer` de `expo-router/drawer` | [src/app/(app)/_layout.tsx](../src/app/(app)/_layout.tsx) |
| `CustomDrawer` sin conectar | [src/components/CustomDrawer.tsx](../src/components/CustomDrawer.tsx) conectado con `drawerContent`, `DrawerItemList` y "Cerrar sesión" |
| `(stack)/_layout.tsx` con `headerLeft`: atrás o abrir el drawer | [src/components/navegacion/opcionesStack.tsx](../src/components/navegacion/opcionesStack.tsx), compartido por los cuatro Stack; usa `DrawerActions.toggleDrawer()` sin `as any` |
| `products/[id].tsx` con `useLocalSearchParams` y `setOptions` | [reservar/[profesionalId].tsx](../src/app/(app)/(cliente)/(inicio)/reservar/[profesionalId].tsx) + [DetalleProfesional](../src/components/pantallas/DetalleProfesional.tsx); id inexistente: mensaje, no `Redirect` |
| `CustomButton` (forwardRef, `<Link asChild>`) | [src/components/Boton.tsx](../src/components/Boton.tsx), una sola copia |
| `useFonts` + `SplashScreen` | [src/app/_layout.tsx](../src/app/_layout.tsx) con ArchivoBlack y Oswald |

**Corregido:** las dos rutas `/home` (aquí cada ruta es única), el `Redirect` relativo, las tabs sin botón de menú (aquí el Stack de cada tab lo tiene) y los íconos con colores `null` de RN 0.88 ([iconoNav.tsx](../src/components/navegacion/iconoNav.tsx)).

## Estado y mapa (Mapas)

| En clase | Aquí |
|---|---|
| `core/actions/permissions/location.ts` | [src/services/ubicacion/permisos.ts](../src/services/ubicacion/permisos.ts); distingue denegado de bloqueado con `canAskAgain` |
| `core/actions/location/location.ts` | [src/services/ubicacion/ubicacion.ts](../src/services/ubicacion/ubicacion.ts); además revisa si el GPS está encendido |
| `usePermissionsStore` | [src/store/usePermisosStore.ts](../src/store/usePermisosStore.ts) |
| `useLocationStore` (le faltaban `watchLocation` y `clearWatchLocation`) | [src/store/useUbicacionStore.ts](../src/store/useUbicacionStore.ts) con `iniciarSeguimiento` / `detenerSeguimiento`, que guarda la suscripción y la libera con `.remove()` |
| `PermissionsCheckerProvider` (AppState, redirección global) | Hook propio [usePermisoUbicacion](../src/hooks/usePermisoUbicacion.ts): mismo AppState, pero solo en `/mapa` (D-17) |
| `OpenStreetMap.tsx` | [src/components/mapa/MapaLeaflet.tsx](../src/components/mapa/MapaLeaflet.tsx): mismo HTML con Leaflet 1.9.4; se mueve con `injectJavaScript` en vez de volver a montar la WebView; avisa si fallan Leaflet o las teselas |
| `CustomMap` ("Usar mi GPS", "Pausar", "Volver a Dosquebradas") | [src/components/mapa/MapaLocal.tsx](../src/components/mapa/MapaLocal.tsx): Centrar mi ubicación, Activar / Pausar / Reanudar seguimiento, Volver al local; detiene el seguimiento al salir (`useFocusEffect`) |
| Coordenadas de Dosquebradas | `UBICACION_LOCAL` en [src/config/negocio.ts](../src/config/negocio.ts) (D-03) |
| `app.json` sin plugin de ubicación | Plugin `expo-location` con el texto del permiso |

Otros stores compartidos: [useSesionStore](../src/store/useSesionStore.ts), [useReservaStore](../src/store/useReservaStore.ts) (borrador de la reserva) y [useCarritoStore](../src/store/useCarritoStore.ts) (cantidades de 1 a 10). `src/store/` ya figura en la estructura del proyecto; en clase los stores estaban en `presentation/store`.

## Lógica pura con pruebas (`src/lib`)

`formatoCOP`, `limitarCantidad`, `calcularTotalCita`, `faltaServicioPrincipal`, `filtrarPorTexto` y `esUuid`, con pruebas en `src/lib/__tests__`. Las pruebas de los mappers están en `src/models/__tests__`.
