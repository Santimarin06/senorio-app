// Detalle de una cita por id (TanStack Query). Las citas cambian seguido (asistencia,
// cancelación), así que la caché dura menos que la del catálogo.
import { useQuery } from '@tanstack/react-query';

import { getCitaById } from '@/services/citas.api';

const unMinuto = 1000 * 60;

export const useCita = (id: string) =>
  useQuery({
    queryKey: ['cita', id],
    queryFn: () => getCitaById(id),
    enabled: id !== '',
    staleTime: unMinuto,
  });
