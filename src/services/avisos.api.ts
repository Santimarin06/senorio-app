// Avisos del profesional (RF-30, D-47). La RLS solo deja ver y marcar los propios; la base los
// crea con triggers, la app nunca los inserta.
import { RECORDATORIOS } from '@/config/negocio';
import { mapAviso, SELECT_AVISO } from '@/models/aviso.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type { NotificacionRespuesta } from '@/types/api';
import type { Aviso } from '@/types/entidades';

export const getAvisos = async (): Promise<Aviso[]> => {
  const { data } = await supabaseApi.get<NotificacionRespuesta[]>('/notificaciones', {
    params: { select: SELECT_AVISO, order: 'creada_en.desc', limit: RECORDATORIOS.avisosVisibles },
  });
  return data.map(mapAviso);
};

type ColumnaMarca = 'mostrada_en' | 'leida_en';

/**
 * Pone la fecha de ahora en la columna dada a los avisos que aún no la tienen. Devuelve los ids
 * que la base confirmó: solo esos cuentan como marcados (RN-12).
 */
const marcar = async (ids: readonly string[], columna: ColumnaMarca): Promise<string[]> => {
  if (ids.length === 0) return [];
  const { data } = await supabaseApi.patch<{ id: string }[]>(
    '/notificaciones',
    { [columna]: new Date().toISOString() },
    {
      params: { id: `in.(${ids.join(',')})`, [columna]: 'is.null', select: 'id' },
      headers: { Prefer: 'return=representation' },
    },
  );
  return data.map((fila) => fila.id);
};

export const marcarLeidos = (ids: readonly string[]) => marcar(ids, 'leida_en');
export const marcarMostrados = (ids: readonly string[]) => marcar(ids, 'mostrada_en');
