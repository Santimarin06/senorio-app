// Respuestas tal como las devuelve Supabase (snake_case), como TMDBMovie en 06-Peliculas.
// Los mappers de src/models las convierten a las entidades de src/types/entidades.ts.

export interface ServicioRespuesta {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_min: number;
  precio: number;
  es_adicional: boolean;
  activo: boolean;
}

export interface ProfesionalRespuesta {
  id: string;
  nombre: string;
  cargo: string | null;
  foto_url: string | null;
  activo: boolean;
}

/** Detalle con los servicios que presta (relación profesional_servicios). */
export interface ProfesionalDetalleRespuesta extends ProfesionalRespuesta {
  servicios: ServicioRespuesta[] | null;
}

export interface ProductoRespuesta {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  foto_url: string | null;
  /** 'cabello' o 'barba' (check de la tabla productos). */
  categoria: string;
  activo: boolean;
}

/** Cita de la tabla citas (D-23) con profesional, servicios y comprobantes embebidos. */
export interface CitaRespuesta {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  total: number;
  profesionales: { nombre: string } | null;
  /** Servicios con el precio del momento de reservar (cita_servicios). */
  cita_servicios?: { nombre: string; precio: number; duracion_min: number }[] | null;
  /** Comprobantes del anticipo; solo los aprobados cuentan como pagados (RN-09). */
  comprobantes?: ComprobanteRespuesta[] | null;
}

/**
 * Cita de la agenda del panel (RF-21, RF-22). El cliente llega por la llave cliente_id y solo
 * con nombre y teléfono; del anticipo, el profesional solo ve los comprobantes aprobados.
 */
export interface CitaAgendaRespuesta {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  total: number;
  profesional_id: string;
  profesionales: { nombre: string } | null;
  cliente: { nombre: string; telefono: string | null } | null;
  cita_servicios?: { nombre: string; precio: number; duracion_min: number }[] | null;
  comprobantes?: { monto: number; estado: string }[] | null;
}

/** Fila de comprobantes (RF-13), embebida en la cita. */
export interface ComprobanteRespuesta {
  id: string;
  tipo: string;
  monto: number;
  estado: string;
  nota_rechazo: string | null;
  archivo_path: string;
  metodo: string | null;
  subido_en: string;
}

/** Respuesta de la función cancelar_cita (RF-09): lo que quedó guardado en la base. */
export interface CancelacionRespuesta {
  estado: string;
  anticipo_aprobado: number;
  /** Estado de la multa de esa cita, o null si no hubo multa. */
  multa_estado: string | null;
}

/** Fila de la función franjas_ocupadas: citas activas y bloqueos, sin datos del cliente. */
export interface FranjaOcupadaRespuesta {
  inicio: string;
  fin: string;
}

export interface FestivoRespuesta {
  fecha: string;
  nombre: string;
}

/** Postgres devuelve las horas como "HH:MM:SS". */
export interface DiaHabilitadoRespuesta {
  fecha: string;
  abierto: boolean;
  apertura: string;
  cierre: string;
  nota: string | null;
}

/** Fila de bloqueos (RF-24) con el nombre del profesional, si lo tiene. */
export interface BloqueoRespuesta {
  id: string;
  profesional_id: string | null;
  inicio: string;
  fin: string;
  motivo: string | null;
  profesionales: { nombre: string } | null;
}

/** Respuesta de /auth/v1/token (password y refresh_token) y de /auth/v1/signup con sesión. */
export interface TokenRespuesta {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
}

/**
 * /auth/v1/signup: con confirmación de correo activa devuelve el usuario sin tokens;
 * sin confirmación devuelve una sesión completa.
 */
export type RegistroRespuesta = TokenRespuesta | { id: string; email?: string };

export interface PerfilRespuesta {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  rol: string;
  /** Ficha del catálogo del usuario con rol profesional (D-13); null para los demás. */
  profesional_id: string | null;
}

/** Errores de Supabase Auth (GoTrue) y de PostgREST. */
export interface ErrorApiRespuesta {
  error_code?: string;
  msg?: string;
  error_description?: string;
  code?: string;
  message?: string;
}

/** Cita embebida en las consultas de revisión (RF-25, RF-28). */
export interface CitaRevisionRespuesta {
  id: string;
  inicio: string;
  estado: string;
  total: number;
  profesionales: { nombre: string } | null;
}

/** Comprobante con su cliente (perfiles!cliente_id) y su cita, para la revisión. */
export interface ComprobanteRevisionRespuesta {
  id: string;
  tipo: string;
  monto: number;
  metodo: string | null;
  subido_en: string;
  archivo_path: string;
  cliente: { nombre: string; telefono: string | null } | null;
  citas: CitaRevisionRespuesta | null;
}

/** Multa con su cliente y su cita (RF-25). */
export interface MultaRevisionRespuesta {
  id: string;
  motivo: string;
  monto: number;
  estado: string;
  resuelta_en: string | null;
  cliente: { nombre: string } | null;
  citas: CitaRevisionRespuesta | null;
}

/** Respuesta de POST /storage/v1/object/sign/<bucket>/<ruta>: ruta relativa con el token. */
export interface UrlFirmadaRespuesta {
  signedURL: string;
}
