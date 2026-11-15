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
