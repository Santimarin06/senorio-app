// Entradas de navegación por rol (SRS §7 y D-16). Las pantallas no escriben rutas sueltas
// para el menú: leen esta tabla a través de src/lib/navegacion.ts.
import type { Ionicons } from '@expo/vector-icons';

import type { Rol } from '@/types/sesion';

export type NombreIcono = keyof typeof Ionicons.glyphMap;

/** Rutas a las que puede llevar una entrada del Drawer. */
export type RutaDrawer =
  | '/inicio'
  | '/panel/mi-agenda'
  | '/panel/agenda'
  | '/mapa'
  | '/politica'
  | '/privacidad';

export interface EntradaDrawer {
  clave: string;
  etiqueta: string;
  ruta: RutaDrawer;
  icono: NombreIcono;
}

/** Primera pantalla de cada rol: a donde llega al iniciar sesión (SRS §7). */
export const INICIO_POR_ROL: Record<Rol, EntradaDrawer> = {
  cliente: { clave: 'inicio', etiqueta: 'Inicio', ruta: '/inicio', icono: 'home-outline' },
  profesional: {
    clave: 'mi-agenda',
    etiqueta: 'Mi agenda',
    ruta: '/panel/mi-agenda',
    icono: 'calendar-outline',
  },
  administrador: {
    clave: 'agenda',
    etiqueta: 'Agenda del local',
    ruta: '/panel/agenda',
    icono: 'calendar-outline',
  },
};

/** Accesos complementarios del Drawer (D-16). "Cerrar sesión" es una acción, no una ruta. */
export const ENTRADAS_COMPLEMENTARIAS: readonly (EntradaDrawer & { roles: readonly Rol[] })[] = [
  {
    clave: 'mapa',
    etiqueta: 'El local',
    ruta: '/mapa',
    icono: 'map-outline',
    roles: ['cliente', 'profesional', 'administrador'],
  },
  {
    clave: 'politica',
    etiqueta: 'Política de reservas',
    ruta: '/politica',
    icono: 'document-text-outline',
    roles: ['cliente', 'profesional', 'administrador'],
  },
  {
    clave: 'privacidad',
    etiqueta: 'Privacidad',
    ruta: '/privacidad',
    icono: 'shield-checkmark-outline',
    roles: ['cliente', 'profesional', 'administrador'],
  },
];
