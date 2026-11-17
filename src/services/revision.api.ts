// Revisión del administrador (RF-25, RF-28, RN-09). La RLS solo deja al administrador leer
// todos los comprobantes y multas y actualizarlos; los triggers registrar_revision_comprobante
// y registrar_resolucion_multa ponen quién y cuándo, y cobrar_multa_con_anticipo pasa la multa
// a 'cobrada_anticipo' al aprobar (D-37). Cada escritura filtra por el estado esperado y pide
// la fila de vuelta: si no vuelve, otra persona ya la resolvió y nada se muestra como hecho (RN-12).
import { COMPROBANTE, REVISION } from '@/config/negocio';
import { env } from '@/config/env';
import { ESTADOS_CON_DEVOLUCION } from '@/lib/revision';
import {
  mapComprobanteRevision,
  mapDevolucionPendiente,
  mapMultaRevision,
  SELECT_COMPROBANTE_REVISION,
  SELECT_MULTA_REVISION,
  sinNulos,
} from '@/models/revision.mapper';
import { storageApi } from '@/services/api/storage-api';
import { supabaseApi } from '@/services/api/supabase-api';
import type {
  ComprobanteRevisionRespuesta,
  MultaRevisionRespuesta,
  UrlFirmadaRespuesta,
} from '@/types/api';
import type {
  ComprobanteRevision,
  DevolucionPendiente,
  EstadoComprobante,
  EstadoMulta,
  MultaRevision,
} from '@/types/entidades';

/** Comprobantes por revisar, del más antiguo al más reciente. */
export const getComprobantesPendientes = async (): Promise<ComprobanteRevision[]> => {
  const { data } = await supabaseApi.get<ComprobanteRevisionRespuesta[]>('/comprobantes', {
    params: { select: SELECT_COMPROBANTE_REVISION, estado: 'eq.pendiente', order: 'subido_en.asc' },
  });
  return sinNulos(data.map(mapComprobanteRevision));
};

export type Revision = { estado: 'aprobado' } | { estado: 'rechazado'; nota: string };

/** RN-09: confirmar (aprobado) o rechazar con motivo. Solo cambia un comprobante pendiente. */
export const revisarComprobante = async (id: string, revision: Revision): Promise<void> => {
  const { data } = await supabaseApi.patch<{ id: string; estado: string }[]>(
    '/comprobantes',
    revision.estado === 'aprobado'
      ? { estado: 'aprobado' }
      : { estado: 'rechazado', nota_rechazo: revision.nota },
    {
      params: { id: `eq.${id}`, estado: 'eq.pendiente', select: 'id,estado' },
      headers: { Prefer: 'return=representation' },
    },
  );
  const estado: EstadoComprobante = revision.estado;
  if (data[0]?.estado !== estado) throw new Error('Este comprobante ya fue revisado.');
};

/**
 * URL firmada del archivo del bucket privado: dura COMPROBANTE.urlFirmadaSegundos y no
 * necesita cabeceras, así que sirve para expo-image y para ampliar la imagen.
 */
export const urlFirmada = async (archivoPath: string): Promise<string> => {
  const { data } = await storageApi.post<UrlFirmadaRespuesta>(
    `/object/sign/${COMPROBANTE.bucket}/${archivoPath}`,
    { expiresIn: COMPROBANTE.urlFirmadaSegundos },
  );
  return `${env.supabaseUrl}/storage/v1${data.signedURL}`;
};

/** RF-25: multas pendientes, de la más antigua a la más reciente. */
export const getMultasPendientes = async (): Promise<MultaRevision[]> => {
  const { data } = await supabaseApi.get<MultaRevisionRespuesta[]>('/multas', {
    params: { select: SELECT_MULTA_REVISION, estado: 'eq.pendiente', order: 'creado_en.asc' },
  });
  return sinNulos(data.map(mapMultaRevision));
};

/** RF-25: las últimas multas resueltas (cobradas del anticipo, pagadas o perdonadas). */
export const getHistorialMultas = async (): Promise<MultaRevision[]> => {
  const { data } = await supabaseApi.get<MultaRevisionRespuesta[]>('/multas', {
    params: {
      select: SELECT_MULTA_REVISION,
      estado: 'neq.pendiente',
      order: 'resuelta_en.desc.nullslast',
      limit: REVISION.historialMultas,
    },
  });
  return sinNulos(data.map(mapMultaRevision));
};

export type Resolucion = Extract<EstadoMulta, 'pagada' | 'perdonada'>;

/** RF-25 y RN-07: marcar pagada o perdonar. Solo cambia una multa que sigue pendiente. */
export const resolverMulta = async (id: string, estado: Resolucion): Promise<void> => {
  const { data } = await supabaseApi.patch<{ id: string; estado: string }[]>(
    '/multas',
    { estado },
    {
      params: { id: `eq.${id}`, estado: 'eq.pendiente', select: 'id,estado' },
      headers: { Prefer: 'return=representation' },
    },
  );
  if (data[0]?.estado !== estado) throw new Error('Esta multa ya fue resuelta.');
};

/**
 * RF-28: anticipos aprobados de citas canceladas o no asistidas sin devolución registrada.
 * citas!inner: el filtro por estado de la cita deja fuera los comprobantes de otras citas.
 */
export const getDevolucionesPendientes = async (): Promise<DevolucionPendiente[]> => {
  const { data } = await supabaseApi.get<ComprobanteRevisionRespuesta[]>('/comprobantes', {
    params: {
      select: SELECT_COMPROBANTE_REVISION.replace('citas(', 'citas!inner('),
      estado: 'eq.aprobado',
      devolucion_monto: 'is.null',
      'citas.estado': `in.(${ESTADOS_CON_DEVOLUCION.join(',')})`,
    },
  });
  return sinNulos(data.map(mapDevolucionPendiente)).sort(
    (a, b) => Date.parse(a.cita.inicio) - Date.parse(b.cita.inicio),
  );
};

/** RF-28: registra el monto devuelto; el trigger fija devuelto_en. Solo si no estaba registrada. */
export const registrarDevolucion = async (comprobanteId: string, monto: number): Promise<void> => {
  const { data } = await supabaseApi.patch<
    { id: string; devolucion_monto: number | null; devuelto_en: string | null }[]
  >(
    '/comprobantes',
    { devolucion_monto: monto },
    {
      params: {
        id: `eq.${comprobanteId}`,
        estado: 'eq.aprobado',
        devolucion_monto: 'is.null',
        select: 'id,devolucion_monto,devuelto_en',
      },
      headers: { Prefer: 'return=representation' },
    },
  );
  const fila = data[0];
  if (fila?.devolucion_monto !== monto || !fila.devuelto_en) {
    throw new Error('Esta devolución ya estaba registrada.');
  }
};
