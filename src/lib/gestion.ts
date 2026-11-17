// Gestión del catálogo por el administrador (RF-26, RF-27, D-43). Funciones puras: validan lo
// que se escribe en los formularios y devuelven un mensaje específico por campo.
import { FOTOS, GESTION } from '@/config/negocio';
import { normalizar } from '@/lib/busqueda';
import { formatoCOP } from '@/lib/dinero';
import { parsearPesos } from '@/lib/finanzas';
import type {
  CategoriaProducto,
  ProductoFormulario,
  ProductoGestion,
  ServicioFormulario,
  ServicioGestion,
} from '@/types/entidades';

/** Errores por campo: la pantalla pone cada uno debajo de su campo. */
export type ErroresFormulario<C extends string> = Partial<Record<C, string>>;

export type ResultadoFormulario<T, C extends string> =
  | { ok: true; valor: T }
  | { ok: false; errores: ErroresFormulario<C> };

/** Lo que escribe el administrador, tal cual (los números llegan como texto). */
export interface EntradaServicio {
  nombre: string;
  descripcion: string;
  duracion: string;
  precio: string;
  esAdicional: boolean;
  /** Ids elegidos (puede incluir profesionales inactivos que ya lo prestaban). */
  profesionales: string[];
}

export type CampoServicio = 'nombre' | 'descripcion' | 'duracion' | 'precio' | 'profesionales';

export interface EntradaProducto {
  nombre: string;
  descripcion: string;
  precio: string;
  categoria: CategoriaProducto | null;
}

export type CampoProducto = 'nombre' | 'descripcion' | 'precio' | 'categoria';

const validarNombre = (nombre: string): string | null => {
  const limpio = nombre.trim();
  if (limpio === '') return 'El nombre es obligatorio.';
  if (limpio.length > GESTION.nombreMaximo) {
    return `El nombre admite hasta ${GESTION.nombreMaximo} caracteres.`;
  }
  return null;
};

const validarDescripcion = (descripcion: string): string | null =>
  descripcion.trim().length > GESTION.descripcionMaxima
    ? `La descripción admite hasta ${GESTION.descripcionMaxima} caracteres.`
    : null;

/** Duración en minutos: entero mayor que 0 ("45"; no "45,5" ni "0"). */
export function validarDuracion(texto: string): { ok: true; valor: number } | { ok: false; error: string } {
  const limpio = texto.trim();
  if (limpio === '') return { ok: false, error: 'Escribe la duración en minutos.' };
  if (!/^\d+$/.test(limpio)) {
    return { ok: false, error: 'La duración debe ser un número entero de minutos, por ejemplo 45.' };
  }
  const valor = Number(limpio);
  if (valor <= 0) return { ok: false, error: 'La duración debe ser mayor que 0 minutos.' };
  if (valor > GESTION.duracionMaximaMin) {
    return { ok: false, error: `La duración no puede pasar de ${GESTION.duracionMaximaMin} minutos.` };
  }
  return { ok: true, valor };
}

/** Precio en pesos: entero mayor o igual a 0 ("35.000" o "35000"). */
export function validarPrecio(texto: string): { ok: true; valor: number } | { ok: false; error: string } {
  if (texto.trim() === '') return { ok: false, error: 'Escribe el precio en pesos.' };
  const r = parsearPesos(texto);
  if (!r.ok) {
    return {
      ok: false,
      error: r.error.includes('negativo')
        ? 'El precio no puede ser negativo.'
        : 'El precio debe ser un número entero en pesos, por ejemplo 35.000.',
    };
  }
  if (r.valor > GESTION.precioMaximo) {
    return { ok: false, error: `El precio no puede pasar de ${formatoCOP(GESTION.precioMaximo)}.` };
  }
  return r;
}

/**
 * RF-26: nombre obligatorio, duración entera > 0, precio entero ≥ 0 y al menos un profesional
 * activo (RN-04). `activos` son los ids de los profesionales activos del local.
 */
export function validarServicio(
  entrada: EntradaServicio,
  activos: ReadonlySet<string>,
): ResultadoFormulario<ServicioFormulario, CampoServicio> {
  const errores: ErroresFormulario<CampoServicio> = {};
  const nombre = validarNombre(entrada.nombre);
  if (nombre) errores.nombre = nombre;
  const descripcion = validarDescripcion(entrada.descripcion);
  if (descripcion) errores.descripcion = descripcion;
  const duracion = validarDuracion(entrada.duracion);
  if (!duracion.ok) errores.duracion = duracion.error;
  const precio = validarPrecio(entrada.precio);
  if (!precio.ok) errores.precio = precio.error;
  const profesionales = [...new Set(entrada.profesionales)];
  if (!profesionales.some((id) => activos.has(id))) {
    errores.profesionales = 'Elige al menos un profesional que preste el servicio.';
  }

  if (!duracion.ok || !precio.ok || Object.keys(errores).length > 0) return { ok: false, errores };
  return {
    ok: true,
    valor: {
      nombre: entrada.nombre.trim(),
      descripcion: entrada.descripcion.trim(),
      duracionMin: duracion.valor,
      precio: precio.valor,
      esAdicional: entrada.esAdicional,
      profesionales,
    },
  };
}

/** RF-27: nombre obligatorio, categoría cabello o barba y precio entero ≥ 0. La foto es opcional. */
export function validarProducto(
  entrada: EntradaProducto,
  foto: string | null,
): ResultadoFormulario<ProductoFormulario, CampoProducto> {
  const errores: ErroresFormulario<CampoProducto> = {};
  const nombre = validarNombre(entrada.nombre);
  if (nombre) errores.nombre = nombre;
  const descripcion = validarDescripcion(entrada.descripcion);
  if (descripcion) errores.descripcion = descripcion;
  const precio = validarPrecio(entrada.precio);
  if (!precio.ok) errores.precio = precio.error;
  if (!entrada.categoria) errores.categoria = 'Elige la categoría: cabello o barba.';

  if (!precio.ok || !entrada.categoria || Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }
  return {
    ok: true,
    valor: {
      nombre: entrada.nombre.trim(),
      descripcion: entrada.descripcion.trim(),
      categoria: entrada.categoria,
      precio: precio.valor,
      foto,
    },
  };
}

/** Texto inicial del formulario para editar (o vacío para crear). */
export const entradaDeServicio = (s: ServicioGestion | null): EntradaServicio => ({
  nombre: s?.nombre ?? '',
  descripcion: s?.descripcion ?? '',
  duracion: s ? String(s.duracionMin) : '',
  precio: s ? String(s.precio) : '',
  esAdicional: s?.esAdicional ?? false,
  profesionales: s ? s.profesionales.map((p) => p.id) : [],
});

export const entradaDeProducto = (p: ProductoGestion | null): EntradaProducto => ({
  nombre: p?.nombre ?? '',
  descripcion: p?.descripcion ?? '',
  precio: p ? String(p.precio) : '',
  categoria: p?.categoria ?? null,
});

/** "45 min · Mario, Camilo" (solo profesionales activos, como en el mockup). */
export const resumenServicio = (s: ServicioGestion): string => {
  const quienes = s.profesionales.filter((p) => p.activo).map((p) => p.nombre);
  return `${s.duracionMin} min · ${quienes.length > 0 ? quienes.join(', ') : 'Sin profesional activo'}`;
};

/** Búsqueda de la pestaña Servicios: por nombre, descripción o profesional, sin tildes. */
export const coincideServicio = (s: ServicioGestion, consulta: string): boolean => {
  const buscado = normalizar(consulta);
  if (buscado === '') return true;
  return [s.nombre, s.descripcion, ...s.profesionales.map((p) => p.nombre)].some((c) =>
    normalizar(c).includes(buscado),
  );
};

/** Búsqueda de la pestaña Productos: por nombre, descripción o categoría. */
export const coincideProducto = (p: ProductoGestion, consulta: string): boolean => {
  const buscado = normalizar(consulta);
  if (buscado === '') return true;
  return [p.nombre, p.descripcion, p.categoria ?? ''].some((c) => normalizar(c).includes(buscado));
};

/** Activos primero y luego por nombre, para que lo desactivado quede al final. */
export const ordenarGestion = <T extends { activo: boolean; nombre: string }>(lista: readonly T[]): T[] =>
  [...lista].sort((a, b) =>
    a.activo === b.activo ? a.nombre.localeCompare(b.nombre, 'es') : a.activo ? -1 : 1,
  );

/** Ruta de la foto en el bucket "fotos": productos/<id o "nuevo">-<ms>.<ext>. Nunca pisa otra. */
export const rutaFotoProducto = (
  productoId: string | null,
  ahoraMs: number,
  mime: 'image/jpeg' | 'image/png',
): string =>
  `${FOTOS.carpetaProductos}/${productoId ?? 'nuevo'}-${ahoraMs}.${mime === 'image/png' ? 'png' : 'jpg'}`;
