// Acciones HTTP de citas (RF-05, RF-08, RF-09). La RLS solo deja ver las citas propias.
import { isAxiosError } from 'axios';

import { esUuid } from '@/lib/ids';
import { mapCancelacion } from '@/models/cancelacion.mapper';
import { mapCita, SELECT_CITA } from '@/models/cita.mapper';
import { mapMultaRevision, SELECT_MULTA_REVISION, sinNulos } from '@/models/revision.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type { CancelacionRespuesta, CitaRespuesta, MultaRevisionRespuesta } from '@/types/api';
import type { Cita, MultaRevision, ResultadoCancelacionBase } from '@/types/entidades';

/** Detalle por id. Devuelve null si el id no existe o el usuario no puede verla (RLS). */
export const getCitaById = async (id: string): Promise<Cita | null> => {
  if (!esUuid(id)) return null;

  try {
    const { data } = await supabaseApi.get<CitaRespuesta[]>('/citas', {
      params: { select: SELECT_CITA, id: `eq.${id}` },
    });
    const cita = data[0];
    return cita ? mapCita(cita) : null;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error; // sin conexión o fallo del servidor: la pantalla muestra error con reintento
  }
};

/** Citas del cliente, de la más reciente a la más antigua (RF-08). */
export const getMisCitas = async (clienteId: string): Promise<Cita[]> => {
  const { data } = await supabaseApi.get<CitaRespuesta[]>('/citas', {
    params: { select: SELECT_CITA, cliente_id: `eq.${clienteId}`, order: 'inicio.desc' },
  });
  return data.map(mapCita);
};

export interface NuevaReserva {
  profesionalId: string;
  servicioIds: string[];
  /** Instante UTC (ISO) de inicio de la franja. */
  inicio: string;
}

/**
 * RF-05: la base calcula duración y total desde el catálogo, valida las reglas y la
 * restricción de exclusión impide la doble reserva. Devuelve el id de la cita creada.
 */
export const reservarCita = async (r: NuevaReserva): Promise<string> => {
  const { data } = await supabaseApi.post<string>('/rpc/reservar_cita', {
    p_profesional_id: r.profesionalId,
    p_servicio_ids: r.servicioIds,
    p_inicio: r.inicio,
  });
  return data;
};

/** Suma de multas pendientes del cliente (RN-07, RF-15). */
export const getMultaPendienteTotal = async (clienteId: string): Promise<number> => {
  const { data } = await supabaseApi.get<{ monto: number }[]>('/multas', {
    params: { select: 'monto', cliente_id: `eq.${clienteId}`, estado: 'eq.pendiente' },
  });
  return data.reduce((suma, m) => suma + Math.round(m.monto), 0);
};

/**
 * RF-15: detalle de las multas pendientes del cliente (cita, motivo y monto), la más antigua
 * primero. Usa las mismas columnas y el mismo mapper que la Revisión del administrador; la RLS
 * solo deja ver las propias.
 */
export const getMisMultasPendientes = async (clienteId: string): Promise<MultaRevision[]> => {
  const { data } = await supabaseApi.get<MultaRevisionRespuesta[]>('/multas', {
    params: {
      select: SELECT_MULTA_REVISION,
      cliente_id: `eq.${clienteId}`,
      estado: 'eq.pendiente',
      order: 'creado_en.asc',
    },
  });
  return sinNulos(data.map(mapMultaRevision));
};

/**
 * RF-09: cancela con la función cancelar_cita (D-30). La base decide a tiempo o tarde y crea
 * la multa; se devuelve lo que quedó guardado, no lo que calculó la pantalla.
 */
export const cancelarCita = async (id: string): Promise<ResultadoCancelacionBase> => {
  const { data } = await supabaseApi.post<CancelacionRespuesta>('/rpc/cancelar_cita', {
    p_cita_id: id,
  });
  return mapCancelacion(data);
};
