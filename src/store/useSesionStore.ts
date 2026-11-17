// Sesión compartida entre pantallas (Zustand). La fuente es Supabase Auth; aquí solo vive lo
// que las pantallas necesitan leer. Se guarda en el teléfono con almacenamientoSesion.ts.
import { create } from 'zustand';

import type { Rol, Tokens, Usuario } from '@/types/sesion';

export type { Rol, Usuario };

interface SesionState {
  usuario: Usuario | null;
  tokens: Tokens | null;
  /** false mientras se lee la sesión guardada al abrir la app. */
  restaurada: boolean;
  establecer: (usuario: Usuario, tokens: Tokens) => void;
  actualizarTokens: (tokens: Tokens) => void;
  /** Perfil que la base confirmó después de editar los datos (RF-15). */
  actualizarUsuario: (usuario: Usuario) => void;
  limpiar: () => void;
  marcarRestaurada: () => void;
}

export const useSesionStore = create<SesionState>()((set) => ({
  usuario: null,
  tokens: null,
  restaurada: false,
  establecer: (usuario, tokens) => set({ usuario, tokens }),
  actualizarTokens: (tokens) => set({ tokens }),
  actualizarUsuario: (usuario) => set({ usuario }),
  limpiar: () => set({ usuario: null, tokens: null }),
  marcarRestaurada: () => set({ restaurada: true }),
}));
