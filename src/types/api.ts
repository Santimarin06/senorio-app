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
  activo: boolean;
}

/**
 * Cita tal como la devolverá la tabla `citas` (esquema supuesto en D-21; la tabla la crea RF-05).
 * `profesionales` llega embebido por la relación profesional_id.
 */
export interface CitaRespuesta {
  id: string;
  inicio: string;
  fin: string;
  estado: string;
  total: number;
  profesionales: { nombre: string } | null;
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
