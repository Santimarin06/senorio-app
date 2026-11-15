// Reglas puras de la sesión y de los formularios de RF-01 (mensajes específicos por campo).

/** Margen para renovar el token antes de que venza: evita que una petición llegue con él vencido. */
export const MARGEN_REFRESCO_MS = 60_000;

export const debeRefrescar = (expiraEn: number, ahoraMs: number): boolean =>
  expiraEn - ahoraMs <= MARGEN_REFRESCO_MS;

export interface DatosRegistro {
  nombre: string;
  telefono: string;
  correo: string;
  contrasena: string;
}

export type ErroresFormulario<T> = Partial<Record<keyof T, string>>;

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Celular colombiano: 10 dígitos que empiezan por 3 (D-25). */
const CELULAR = /^3\d{9}$/;
/** Mínimo de Supabase Auth por defecto. */
export const CONTRASENA_MINIMA = 6;

/** Quita espacios, guiones y el indicativo +57 que la persona pueda escribir. */
export const normalizarTelefono = (telefono: string): string =>
  telefono.replace(/[\s()-]/g, '').replace(/^\+?57(?=3\d{9}$)/, '');

export const normalizarCorreo = (correo: string): string => correo.trim().toLowerCase();

const errorCorreo = (correo: string): string | undefined => {
  const c = normalizarCorreo(correo);
  if (c === '') return 'Escribe tu correo.';
  if (!CORREO.test(c)) return 'El correo no es válido, por ejemplo nombre@correo.com.';
  return undefined;
};

export function validarRegistro(d: DatosRegistro): ErroresFormulario<DatosRegistro> {
  const errores: ErroresFormulario<DatosRegistro> = {};
  const nombre = d.nombre.trim();
  if (nombre === '') errores.nombre = 'Escribe tu nombre.';
  else if (nombre.length < 2) errores.nombre = 'El nombre es muy corto.';

  const telefono = normalizarTelefono(d.telefono);
  if (telefono === '') errores.telefono = 'Escribe tu celular.';
  else if (!/^\d+$/.test(telefono)) errores.telefono = 'El celular solo lleva números.';
  else if (!CELULAR.test(telefono)) errores.telefono = 'El celular tiene 10 dígitos y empieza por 3.';

  const correo = errorCorreo(d.correo);
  if (correo) errores.correo = correo;

  if (d.contrasena === '') errores.contrasena = 'Escribe una contraseña.';
  else if (d.contrasena.length < CONTRASENA_MINIMA)
    errores.contrasena = `La contraseña debe tener al menos ${CONTRASENA_MINIMA} caracteres.`;
  return errores;
}

export function validarInicioSesion(d: { correo: string; contrasena: string }) {
  const errores: ErroresFormulario<{ correo: string; contrasena: string }> = {};
  const correo = errorCorreo(d.correo);
  if (correo) errores.correo = correo;
  if (d.contrasena === '') errores.contrasena = 'Escribe tu contraseña.';
  return errores;
}

export const hayErrores = (errores: object): boolean => Object.keys(errores).length > 0;
