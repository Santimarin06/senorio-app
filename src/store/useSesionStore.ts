// Sesión compartida entre pantallas (Zustand, como los stores del proyecto Mapas).
// Es temporal: vive en memoria y se pierde al cerrar la app. RF-01 la reemplaza por Supabase Auth.
import { create } from 'zustand';

import type { Rol, Usuario } from '@/types/sesion';

export type { Rol, Usuario };

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
