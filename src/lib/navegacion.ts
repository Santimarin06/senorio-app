// Lógica pura de navegación por rol: qué ve cada rol en el Drawer y a dónde llega al entrar.
import {
  ENTRADAS_COMPLEMENTARIAS,
  INICIO_POR_ROL,
  type EntradaDrawer,
  type RutaDrawer,
} from '@/config/navegacion';
import type { Rol } from '@/types/sesion';

/** Primera pantalla del rol después de iniciar sesión. */
export const rutaInicial = (rol: Rol): RutaDrawer => INICIO_POR_ROL[rol].ruta;

/** Entradas del Drawer del rol: su sección principal y los accesos que le corresponden. */
export const entradasDrawer = (rol: Rol): EntradaDrawer[] => [
  INICIO_POR_ROL[rol],
  ...ENTRADAS_COMPLEMENTARIAS.filter((e) => e.roles.includes(rol)).map(
    ({ clave, etiqueta, ruta, icono }) => ({ clave, etiqueta, ruta, icono }),
  ),
];

const coincide = (ruta: string, pathname: string) =>
  pathname === ruta || pathname.startsWith(`${ruta}/`);

/**
 * Clave de la entrada resaltada. Un acceso complementario se resalta solo en su ruta;
 * cualquier otra pantalla (tabs, flujo de reserva, detalle de cita) pertenece a la sección principal.
 */
export const entradaActiva = (entradas: EntradaDrawer[], pathname: string): string | null => {
  const [principal, ...resto] = entradas;
  const complementaria = resto.find((e) => coincide(e.ruta, pathname));
  return complementaria?.clave ?? principal?.clave ?? null;
};

/** ¿El usuario puede estar en la sección de este rol? */
export const puedeEntrar = (rolUsuario: Rol | undefined, rolSeccion: Rol): boolean =>
  rolUsuario === rolSeccion;
