// Acciones HTTP del comprobante del anticipo (RF-13). Dos pasos: subir la imagen al bucket
// privado y registrar la fila (o reemplazar la imagen de una pendiente). La base valida las
// reglas (RN-07, RN-08) en preparar_comprobante y reemplazar_comprobante (D-38).
import { COMPROBANTE } from '@/config/negocio';
import { env } from '@/config/env';
import { mapComprobante } from '@/models/cita.mapper';
import { storageApi } from '@/services/api/storage-api';
import { supabaseApi } from '@/services/api/supabase-api';
import type { ComprobanteRespuesta } from '@/types/api';
import type { Comprobante, ImagenComprobante, MedioPago, TipoAnticipo } from '@/types/entidades';

/**
 * Sube la imagen como ArrayBuffer: en React Native Storage no acepta Blob ni File, y así el
 * cuerpo son los bytes ya validados. x-upsert en false: nunca pisa otro archivo.
 */
export const subirArchivo = async (ruta: string, imagen: ImagenComprobante): Promise<void> => {
  await storageApi.post(`/object/${COMPROBANTE.bucket}/${ruta}`, imagen.bytes, {
    headers: { 'Content-Type': imagen.mime, 'x-upsert': 'false' },
  });
};

export interface NuevoComprobante {
  citaId: string;
  tipo: TipoAnticipo;
  monto: number;
  metodo: MedioPago;
  archivoPath: string;
}

/** Registra el comprobante; la base lo deja pendiente (RN-09). */
export const crearComprobante = async (c: NuevoComprobante): Promise<Comprobante> => {
  const { data } = await supabaseApi.post<ComprobanteRespuesta[]>(
    '/comprobantes',
    {
      cita_id: c.citaId,
      tipo: c.tipo,
      monto: c.monto,
      metodo: c.metodo,
      archivo_path: c.archivoPath,
    },
    {
      params: { select: 'id,tipo,monto,estado,nota_rechazo,archivo_path,metodo,subido_en' },
      headers: { Prefer: 'return=representation' },
    },
  );
  const fila = data[0];
  if (!fila) throw new Error('La base no devolvió el comprobante.');
  return mapComprobante(fila);
};

/** Cambia la imagen de un comprobante pendiente sin crear otra fila (D-38). */
export const reemplazarComprobante = async (
  comprobanteId: string,
  archivoPath: string,
): Promise<Comprobante> => {
  const { data } = await supabaseApi.post<ComprobanteRespuesta>('/rpc/reemplazar_comprobante', {
    p_comprobante_id: comprobanteId,
    p_archivo_path: archivoPath,
  });
  return mapComprobante(data);
};

/** URL del archivo privado: se pide con el token del usuario (la política solo deja ver los propios). */
export const urlArchivo = (archivoPath: string): string =>
  `${env.supabaseUrl}/storage/v1/object/authenticated/${COMPROBANTE.bucket}/${archivoPath}`;
