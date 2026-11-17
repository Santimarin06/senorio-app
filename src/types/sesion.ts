// Sesión del usuario con Supabase Auth (RF-01, D-25).

export type Rol = 'cliente' | 'profesional' | 'administrador';

/** Perfil de la tabla perfiles: lo que la app necesita saber de quien inició sesión. */
export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  correo: string;
  telefono: string;
  /** Ficha del profesional (tabla profesionales) si el rol es profesional; si no, null. */
  profesionalId: string | null;
}

/** Tokens de Supabase Auth. expiraEn es un instante en milisegundos (Date.now()). */
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiraEn: number;
}
