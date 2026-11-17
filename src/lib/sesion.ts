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

const errorNombre = (nombre: string): string | undefined => {
  const n = nombre.trim();
  if (n === '') return 'Escribe tu nombre.';
  if (n.length < 2) return 'El nombre es muy corto.';
  return undefined;
};

const errorTelefono = (telefono: string): string | undefined => {
  const t = normalizarTelefono(telefono);
  if (t === '') return 'Escribe tu celular.';
  if (!/^\d+$/.test(t)) return 'El celular solo lleva números.';
  if (!CELULAR.test(t)) return 'El celular tiene 10 dígitos y empieza por 3.';
  return undefined;
};

export function validarRegistro(d: DatosRegistro): ErroresFormulario<DatosRegistro> {
  const errores: ErroresFormulario<DatosRegistro> = {};
  const nombre = errorNombre(d.nombre);
  if (nombre) errores.nombre = nombre;

  const telefono = errorTelefono(d.telefono);
  if (telefono) errores.telefono = telefono;

  const correo = errorCorreo(d.correo);
  if (correo) errores.correo = correo;

  if (d.contrasena === '') errores.contrasena = 'Escribe una contraseña.';
  else if (d.contrasena.length < CONTRASENA_MINIMA)
    errores.contrasena = `La contraseña debe tener al menos ${CONTRASENA_MINIMA} caracteres.`;
  return errores;
}

/** Datos que el usuario puede cambiar en Cuenta (RF-15): la base solo deja editar estos dos. */
export interface DatosPerfil {
  nombre: string;
  telefono: string;
}

/** "Editar mis datos": mismas reglas que el registro para nombre y celular. */
export function validarDatosPerfil(d: DatosPerfil): ErroresFormulario<DatosPerfil> {
  const errores: ErroresFormulario<DatosPerfil> = {};
  const nombre = errorNombre(d.nombre);
  if (nombre) errores.nombre = nombre;
  const telefono = errorTelefono(d.telefono);
  if (telefono) errores.telefono = telefono;
  return errores;
}

/** Datos listos para guardar: nombre sin espacios sobrantes y celular de 10 dígitos. */
export const normalizarDatosPerfil = (d: DatosPerfil): DatosPerfil => ({
  nombre: d.nombre.trim(),
  telefono: normalizarTelefono(d.telefono),
});

/** ¿Cambió algo frente a lo guardado? Sin cambios no se envía nada. */
export const hayCambiosPerfil = (actual: DatosPerfil, nuevo: DatosPerfil): boolean => {
  const n = normalizarDatosPerfil(nuevo);
  return n.nombre !== actual.nombre.trim() || n.telefono !== normalizarTelefono(actual.telefono);
};

export function validarInicioSesion(d: { correo: string; contrasena: string }) {
  const errores: ErroresFormulario<{ correo: string; contrasena: string }> = {};
  const correo = errorCorreo(d.correo);
  if (correo) errores.correo = correo;
  if (d.contrasena === '') errores.contrasena = 'Escribe tu contraseña.';
  return errores;
}

export const hayErrores = (errores: object): boolean => Object.keys(errores).length > 0;
