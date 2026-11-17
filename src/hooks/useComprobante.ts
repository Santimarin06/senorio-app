// Hooks del comprobante del anticipo (RF-13). Enviar = subir la imagen y luego registrarla
// (o reemplazar la de un pendiente). Si falla cualquier paso, la mutación queda en error y la
// pantalla no muestra nada como recibido (RN-12, RN-14); reintentar repite los dos pasos.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { env } from '@/config/env';
import { rutaComprobante } from '@/lib/comprobante';
import {
  crearComprobante,
  reemplazarComprobante,
  subirArchivo,
  urlArchivo,
} from '@/services/comprobantes.api';
import { tokenVigente } from '@/services/token';
import { useSesionStore } from '@/store/useSesionStore';
import type { Comprobante, ImagenComprobante, MedioPago, TipoAnticipo } from '@/types/entidades';

export type EnvioComprobante =
  | {
      modo: 'nuevo';
      citaId: string;
      tipo: TipoAnticipo;
      monto: number;
      metodo: MedioPago;
      imagen: ImagenComprobante;
    }
  | { modo: 'reemplazo'; citaId: string; comprobanteId: string; imagen: ImagenComprobante };

export const useEnviarComprobante = () => {
  const queryClient = useQueryClient();
  const clienteId = useSesionStore((s) => s.usuario?.id ?? '');

  return useMutation({
    mutationFn: async (envio: EnvioComprobante): Promise<Comprobante> => {
      if (clienteId === '') throw new Error('No hay sesión.');
      // 1. La imagen va a la carpeta del cliente con un nombre nuevo cada vez.
      const ruta = rutaComprobante(clienteId, envio.citaId, Date.now(), envio.imagen.mime);
      await subirArchivo(ruta, envio.imagen);
      // 2. Solo si el archivo quedó guardado se registra el comprobante.
      return envio.modo === 'nuevo'
        ? crearComprobante({
            citaId: envio.citaId,
            tipo: envio.tipo,
            monto: envio.monto,
            metodo: envio.metodo,
            archivoPath: ruta,
          })
        : reemplazarComprobante(envio.comprobanteId, ruta);
    },
    // Bien o mal, se relee la cita: el estado del anticipo pudo cambiar mientras tanto.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['citas'] }),
  });
};

/**
 * Fuente para ver la imagen guardada con expo-image: el bucket es privado, así que la
 * petición lleva el token vigente. Cambia la ruta al reemplazar, así que la caché es por ruta.
 */
export const useImagenComprobante = (archivoPath: string | null) =>
  useQuery({
    queryKey: ['comprobantes', 'imagen', archivoPath],
    queryFn: async () => {
      const token = await tokenVigente();
      return {
        uri: urlArchivo(archivoPath ?? ''),
        headers: { Authorization: `Bearer ${token ?? ''}`, apikey: env.supabaseAnonKey },
      };
    },
    enabled: archivoPath !== null,
    staleTime: 1000 * 60 * 5,
  });
