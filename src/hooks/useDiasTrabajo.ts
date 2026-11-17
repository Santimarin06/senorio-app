// Hooks de días de trabajo y bloqueos (RF-24). Cada escritura invalida ['disponibilidad'] para
// que el horario semanal del cliente deje de ofrecer (u ofrezca) esas franjas.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import {
  crearBloqueo,
  getBloqueosVigentes,
  getDiasEspeciales,
  guardarDiaEspecial,
  quitarBloqueo,
  quitarDiaEspecial,
  type NuevoBloqueo,
} from '@/services/diasTrabajo.api';
import type { DiaEspecial } from '@/types/entidades';

const unMinuto = 60_000;

/** Lo que cambia al guardar: las excepciones, los bloqueos y las franjas que ve el cliente. */
const refrescar = (queryClient: QueryClient, clave: 'dias-especiales' | 'bloqueos') =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: [clave] }),
    queryClient.invalidateQueries({ queryKey: ['disponibilidad'] }),
  ]);

/** Excepciones de dias_habilitados entre dos fechas (ambas incluidas). */
export const useDiasEspeciales = (desde: string, hasta: string) =>
  useQuery({
    queryKey: ['dias-especiales', desde, hasta],
    queryFn: () => getDiasEspeciales(desde, hasta),
    staleTime: unMinuto,
  });

export const useGuardarDiaEspecial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dia: DiaEspecial) => guardarDiaEspecial(dia),
    onSettled: () => refrescar(queryClient, 'dias-especiales'),
  });
};

export const useQuitarDiaEspecial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fecha: string) => quitarDiaEspecial(fecha),
    onSettled: () => refrescar(queryClient, 'dias-especiales'),
  });
};

/** Bloqueos que aún no terminan. "Ahora" se toma al pedir, no al montar la pantalla. */
export const useBloqueos = () =>
  useQuery({
    queryKey: ['bloqueos'],
    queryFn: () => getBloqueosVigentes(new Date().toISOString()),
    staleTime: unMinuto,
  });

export const useCrearBloqueo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bloqueo: NuevoBloqueo) => crearBloqueo(bloqueo),
    onSettled: () => refrescar(queryClient, 'bloqueos'),
  });
};

export const useQuitarBloqueo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quitarBloqueo(id),
    onSettled: () => refrescar(queryClient, 'bloqueos'),
  });
};
