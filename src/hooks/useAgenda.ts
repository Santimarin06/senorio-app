// Hooks de la agenda del panel (RF-21, RF-22, RF-23). La clave empieza por 'citas' para que
// reservar, cancelar o marcar asistencia refresque también la agenda.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { getAgenda, marcarAsistencia, type FiltroAgenda } from '@/services/agenda.api';
import type { MarcaAsistencia } from '@/types/entidades';

/** La agenda cambia cuando un cliente reserva o cancela: la caché dura poco. */
const treintaSegundos = 30_000;

/**
 * Citas de un rango. Con profesionalId, solo las de ese profesional (Mi agenda); sin él, las
 * de todos (agenda del administrador, RF-22).
 */
export const useAgenda = ({ desde, hasta, profesionalId }: FiltroAgenda) =>
  useQuery({
    queryKey: ['citas', 'agenda', profesionalId ?? 'todos', desde, hasta],
    queryFn: () => getAgenda({ desde, hasta, profesionalId }),
    staleTime: treintaSegundos,
  });

/** RF-23: Asistió o No asistió. Al terminar (bien o mal) refresca todas las citas. */
export const useMarcarAsistencia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ citaId, estado }: { citaId: string; estado: MarcaAsistencia }) =>
      marcarAsistencia(citaId, estado),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['citas'] }),
  });
};

/**
 * "Ahora" en milisegundos, actualizado cada cierto tiempo: así una cita pasa a "Por marcar"
 * y se habilita "No asistió" sin que la persona tenga que recargar (D-31).
 */
export const useAhora = (cadaMs = treintaSegundos): number => {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), cadaMs);
    return () => clearInterval(intervalo);
  }, [cadaMs]);
  return ahora;
};
