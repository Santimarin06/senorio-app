// Hooks de la revisión del administrador (RF-25, RF-28). Las claves empiezan por 'citas':
// cualquier cambio de citas (asistencia, cancelación, comprobante) refresca la revisión, y cada
// escritura de aquí refresca las citas, la agenda y la multa pendiente del cliente.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { COMPROBANTE } from '@/config/negocio';
import {
  getComprobantesPendientes,
  getDevolucionesPendientes,
  getHistorialMultas,
  getMultasPendientes,
  registrarDevolucion,
  resolverMulta,
  revisarComprobante,
  urlFirmada,
  type Resolucion,
  type Revision,
} from '@/services/revision.api';

const treintaSegundos = 30_000;

export const useComprobantesPendientes = () =>
  useQuery({
    queryKey: ['citas', 'revision', 'comprobantes'],
    queryFn: getComprobantesPendientes,
    staleTime: treintaSegundos,
  });

export const useMultasPendientes = () =>
  useQuery({
    queryKey: ['citas', 'revision', 'multas'],
    queryFn: getMultasPendientes,
    staleTime: treintaSegundos,
  });

export const useHistorialMultas = () =>
  useQuery({
    queryKey: ['citas', 'revision', 'historial-multas'],
    queryFn: getHistorialMultas,
    staleTime: treintaSegundos,
  });

export const useDevolucionesPendientes = () =>
  useQuery({
    queryKey: ['citas', 'revision', 'devoluciones'],
    queryFn: getDevolucionesPendientes,
    staleTime: treintaSegundos,
  });

/**
 * URL firmada de la imagen del comprobante. Se renueva antes de que venza: la caché dura la
 * mitad de la vida de la URL.
 */
export const useUrlFirmada = (archivoPath: string) => {
  const mitad = (COMPROBANTE.urlFirmadaSegundos * 1000) / 2;
  return useQuery({
    queryKey: ['comprobantes', 'firmada', archivoPath],
    queryFn: () => urlFirmada(archivoPath),
    staleTime: mitad,
    gcTime: mitad,
  });
};

/** Bien o mal, se relee todo lo que depende de citas (sin actualización optimista, RN-12). */
const useRefrescarCitas = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['citas'] });
};

export const useRevisarComprobante = () => {
  const refrescar = useRefrescarCitas();
  return useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: Revision }) => revisarComprobante(id, revision),
    onSettled: refrescar,
  });
};

export const useResolverMulta = () => {
  const refrescar = useRefrescarCitas();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: Resolucion }) => resolverMulta(id, estado),
    onSettled: refrescar,
  });
};

export const useRegistrarDevolucion = () => {
  const refrescar = useRefrescarCitas();
  return useMutation({
    mutationFn: ({ comprobanteId, monto }: { comprobanteId: string; monto: number }) =>
      registrarDevolucion(comprobanteId, monto),
    onSettled: refrescar,
  });
};
