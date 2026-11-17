// Agenda del panel (RF-21, RF-22) y asistencia (RF-23).
// La RLS decide qué citas se ven: el profesional solo las suyas, el administrador todas. El
// filtro por profesional_id es además necesario para el profesional, porque también ve las
// citas que reservó como cliente con otro profesional.
import { instanteDeFranja } from '@/lib/disponibilidad';
import { mapCitaAgenda, SELECT_AGENDA } from '@/models/agenda.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type { CitaAgendaRespuesta } from '@/types/api';
import type { CitaAgenda, MarcaAsistencia } from '@/types/entidades';

export interface FiltroAgenda {
  /** Fecha de Bogotá 'YYYY-MM-DD', incluida. */
  desde: string;
  /** Fecha de Bogotá 'YYYY-MM-DD', excluida. */
  hasta: string;
  /** Solo las citas de este profesional. Sin él (agenda del administrador), todas. */
  profesionalId?: string;
}

/** Medianoche de Bogotá de una fecha, como instante UTC (ISO). */
const medianocheBogota = (fecha: string) => instanteDeFranja(fecha, 0);

/** Estados que ocupan la agenda: las canceladas y reagendadas liberaron su franja (D-39). */
const ESTADOS_AGENDA = '(confirmada,por_marcar,asistida,no_asistida)';

export const getAgenda = async ({ desde, hasta, profesionalId }: FiltroAgenda): Promise<CitaAgenda[]> => {
  const { data } = await supabaseApi.get<CitaAgendaRespuesta[]>('/citas', {
    params: {
      select: SELECT_AGENDA,
      and: `(inicio.gte.${medianocheBogota(desde)},inicio.lt.${medianocheBogota(hasta)})`,
      estado: `in.${ESTADOS_AGENDA}`,
      ...(profesionalId ? { profesional_id: `eq.${profesionalId}` } : {}),
      order: 'inicio.asc',
    },
  });
  return data.map(mapCitaAgenda);
};

/**
 * RF-23: marca la asistencia con un PATCH a citas.estado. La política "Marcar asistencia" y el
 * trigger validar_cambio_estado_cita deciden si se puede; el trigger generar_multa crea la
 * multa de la no asistencia. Si la RLS no deja ver la cita, PostgREST no actualiza nada y
 * devuelve una lista vacía: eso también es un error, porque nada se guardó (RN-12).
 */
export const marcarAsistencia = async (citaId: string, estado: MarcaAsistencia): Promise<void> => {
  const { data } = await supabaseApi.patch<{ id: string; estado: string }[]>(
    '/citas',
    { estado },
    {
      params: { id: `eq.${citaId}`, select: 'id,estado' },
      headers: { Prefer: 'return=representation' },
    },
  );
  if (data[0]?.estado !== estado) throw new Error('No encontramos esta cita.');
};
