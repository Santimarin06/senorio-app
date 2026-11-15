// Sesión del usuario (temporal en Zustand hasta RF-01).

export type Rol = 'cliente' | 'profesional' | 'administrador';

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
}
