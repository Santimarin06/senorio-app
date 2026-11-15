// Sesión compartida entre pantallas (Zustand, como los stores del proyecto Mapas).
import { create } from 'zustand';

export type Rol = 'cliente' | 'profesional' | 'administrador';

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
}

interface SesionState {
  usuario: Usuario | null;
  iniciarSesion: (usuario: Usuario) => void;
  cerrarSesion: () => void;
}

export const useSesionStore = create<SesionState>()((set) => ({
  usuario: null,
  iniciarSesion: (usuario) => set({ usuario }),
  cerrarSesion: () => set({ usuario: null }),
}));
