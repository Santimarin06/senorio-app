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
  comprobantes?: { monto: number; estado: string }[] | null;
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
}

/** Errores de Supabase Auth (GoTrue) y de PostgREST. */
export interface ErrorApiRespuesta {
  error_code?: string;
  msg?: string;
  error_description?: string;
  code?: string;
  message?: string;
}
