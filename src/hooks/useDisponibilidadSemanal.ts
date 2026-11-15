// Hook propio del horario semanal (RF-04, disponibilidad semanal).
// TanStack Query trae de Supabase lo ocupado de la semana; calcularSemana (función pura de
// src/lib) decide qué franjas se muestran. La duración no va en la queryKey: cambiar de
// servicios recalcula sin volver a pedir datos.
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  agruparPorDia,
  aBogota,
  calcularSemana,
  type DiaDisponibilidad,
  type HorarioEspecial,
} from '@/lib/disponibilidad';
import { totalSeleccion } from '@/lib/reserva';
import { getOcupacionSemana } from '@/services/disponibilidad.api';
import type { Servicio } from '@/types/entidades';

/** Las franjas cambian cuando otro cliente reserva: la caché dura poco. */
const treintaSegundos = 30_000;

export interface DisponibilidadSemanal {
  /** Siete días de lunes a domingo; vacío mientras carga o si no hay servicios elegidos. */
  dias: DiaDisponibilidad[];
  cargando: boolean;
  error: Error | null;
  reintentar: () => void;
}

/**
 * @param profesionalId profesional elegido.
 * @param servicios servicios elegidos: su duración sumada es la de cada franja (RN-03).
 * @param lunes lunes de la semana a mostrar, 'YYYY-MM-DD' (usar lunesDe).
 */
export function useDisponibilidadSemanal(
  profesionalId: string,
  servicios: readonly Servicio[],
  lunes: string,
): DisponibilidadSemanal {
  const duracionMin = totalSeleccion(servicios).duracionMin;

  const consulta = useQuery({
    queryKey: ['disponibilidad', profesionalId, lunes],
    queryFn: () => getOcupacionSemana(profesionalId, lunes),
    enabled: profesionalId !== '' && duracionMin > 0,
    staleTime: treintaSegundos,
  });

  const { data, refetch, isPending, isError, error } = consulta;

  const dias = useMemo(() => {
    if (!data || duracionMin <= 0) return [];
    const especiales = new Map<string, HorarioEspecial>(
      data.especiales.map(({ fecha, ...horario }) => [fecha, horario]),
    );
    return calcularSemana({
      lunes,
      duracionMin,
      festivos: new Set(data.festivos),
      diasHabilitados: new Set(data.especiales.filter((d) => d.abierto).map((d) => d.fecha)),
      especiales,
      // franjas_ocupadas no distingue citas de bloqueos: para el cliente ambas son "ocupada".
      citasPorDia: agruparPorDia(data.ocupadas),
      bloqueosPorDia: {},
      // "Ahora" en hora de Bogotá, sin depender de la zona del teléfono.
      ahora: aBogota(new Date()),
    });
  }, [data, duracionMin, lunes]);

  return {
    dias,
    // Con la consulta deshabilitada (sin servicios) isPending queda en true: no es una carga real.
    cargando: isPending && consulta.fetchStatus !== 'idle',
    error: isError ? error : null,
    reintentar: () => {
      void refetch();
    },
  };
}
