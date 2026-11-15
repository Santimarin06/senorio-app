// Borrador de la reserva: lo comparten Elegir profesional, Servicios, Horario y Resumen.
// No es la reserva guardada: esa vive en Supabase (RN-12).
import { create } from 'zustand';

import type { Profesional, Servicio } from '@/types/entidades';

interface ReservaState {
  profesional: Profesional | null;
  servicios: Servicio[];
  /** Inicio de la franja elegida, instante en UTC (ISO). */
  inicio: string | null;

  elegirProfesional: (profesional: Profesional) => void;
  alternarServicio: (servicio: Servicio) => void;
  elegirInicio: (inicioIso: string) => void;
  reiniciar: () => void;
}

export const useReservaStore = create<ReservaState>()((set) => ({
  profesional: null,
  servicios: [],
  inicio: null,

  // Cambiar de profesional borra lo elegido: un servicio solo se presta con su profesional (RN-04).
  elegirProfesional: (profesional) =>
    set((estado) =>
      estado.profesional?.id === profesional.id
        ? estado
        : { profesional, servicios: [], inicio: null },
    ),

  alternarServicio: (servicio) =>
    set((estado) => ({
      servicios: estado.servicios.some((s) => s.id === servicio.id)
        ? estado.servicios.filter((s) => s.id !== servicio.id)
        : [...estado.servicios, servicio],
      inicio: null,
    })),

  elegirInicio: (inicio) => set({ inicio }),
  reiniciar: () => set({ profesional: null, servicios: [], inicio: null }),
}));
