// Hooks de citas (TanStack Query). Las citas cambian seguido (asistencia, cancelación), así
// que la caché dura menos que la del catálogo. Todas las claves empiezan por 'citas' para
// invalidarlas juntas después de reservar.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelarCita,
  getCitaById,
  getMisCitas,
  getMisMultasPendientes,
  getMultaPendienteTotal,
  reservarCita,
  type NuevaReserva,
} from '@/services/citas.api';
import { useSesionStore } from '@/store/useSesionStore';

const unMinuto = 1000 * 60;

export const useCita = (id: string) =>
  useQuery({
    queryKey: ['citas', 'detalle', id],
    queryFn: () => getCitaById(id),
    enabled: id !== '',
    staleTime: unMinuto,
  });

/** RF-08: citas del cliente con sesión. */
export const useMisCitas = () => {
  const clienteId = useSesionStore((s) => s.usuario?.id ?? '');
  return useQuery({
    queryKey: ['citas', 'mias', clienteId],
    queryFn: () => getMisCitas(clienteId),
    enabled: clienteId !== '',
    staleTime: unMinuto,
  });
};

/** RN-07: multa pendiente del cliente, para avisar antes de confirmar. */
export const useMultaPendiente = () => {
  const clienteId = useSesionStore((s) => s.usuario?.id ?? '');
  return useQuery({
    queryKey: ['citas', 'multa-pendiente', clienteId],
    queryFn: () => getMultaPendienteTotal(clienteId),
    enabled: clienteId !== '',
    staleTime: unMinuto,
  });
};

/** RF-15: detalle de cada multa pendiente para la Cuenta. Empieza por 'citas' para refrescarse con ellas. */
export const useMisMultasPendientes = () => {
  const clienteId = useSesionStore((s) => s.usuario?.id ?? '');
  return useQuery({
    queryKey: ['citas', 'multas-pendientes', clienteId],
    queryFn: () => getMisMultasPendientes(clienteId),
    enabled: clienteId !== '',
    staleTime: unMinuto,
  });
};

/** RF-05: reservar. Al terminar (bien o mal) refresca citas y disponibilidad. */
export const useReservarCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (r: NuevaReserva) => reservarCita(r),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['citas'] }),
        queryClient.invalidateQueries({ queryKey: ['disponibilidad'] }),
      ]);
    },
  });
};

/**
 * RF-09: cancelar. Al terminar (bien o mal) refresca citas (detalle, lista y multa pendiente)
 * y disponibilidad: la franja queda libre o la cita pudo cambiar de estado mientras tanto.
 */
export const useCancelarCita = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelarCita(id),
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['citas'] }),
        queryClient.invalidateQueries({ queryKey: ['disponibilidad'] }),
      ]);
    },
  });
};
