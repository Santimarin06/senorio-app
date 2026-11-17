// Hooks de la tab Avisos (RF-30). La clave 'avisos' la invalida también useRecordatorios al
// sincronizar.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PREFIJO_RECORDATORIO } from '@/lib/recordatorios';
import { getAvisos, marcarLeidos } from '@/services/avisos.api';
import { idsProgramados } from '@/services/notificaciones';

const treintaSegundos = 30_000;

export const CLAVE_AVISOS = ['avisos'] as const;
export const CLAVE_PROGRAMADOS = ['avisos', 'programados'] as const;

/** Avisos del profesional, del más nuevo al más viejo. */
export const useAvisos = (habilitado = true) =>
  useQuery({
    queryKey: CLAVE_AVISOS,
    queryFn: getAvisos,
    staleTime: treintaSegundos,
    enabled: habilitado,
  });

/** Cuántos recordatorios hay programados en este teléfono (no es un dato de la base). */
export const useRecordatoriosProgramados = () =>
  useQuery({
    queryKey: CLAVE_PROGRAMADOS,
    queryFn: async () =>
      (await idsProgramados()).filter((id) => id.startsWith(PREFIJO_RECORDATORIO)).length,
    staleTime: treintaSegundos,
  });

/** Marca avisos como leídos. Al terminar (bien o mal) vuelve a leer la lista de la base. */
export const useMarcarLeidos = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => marcarLeidos(ids),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CLAVE_AVISOS }),
  });
};
