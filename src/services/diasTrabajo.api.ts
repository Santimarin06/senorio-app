// Días de trabajo y bloqueos del administrador (RF-24). El administrador escribe directo en
// dias_habilitados y bloqueos: la RLS solo se lo permite a él ("Administrador gestiona …").
// Cada escritura pide la fila de vuelta (return=representation): si no llega, nada se guardó
// y se lanza un error (RN-12).
import { horaTexto } from '@/lib/diasTrabajo';
import {
  mapBloqueo,
  mapDiaEspecial,
  SELECT_BLOQUEO,
  SELECT_DIA,
} from '@/models/diasTrabajo.mapper';
import { supabaseApi } from '@/services/api/supabase-api';
import type { BloqueoRespuesta, DiaHabilitadoRespuesta } from '@/types/api';
import type { Bloqueo, DiaEspecial } from '@/types/entidades';

const devolverFila = { Prefer: 'return=representation' };

/** Excepciones de dias_habilitados entre dos fechas 'YYYY-MM-DD' (ambas incluidas). */
export const getDiasEspeciales = async (desde: string, hasta: string): Promise<DiaEspecial[]> => {
  const { data } = await supabaseApi.get<DiaHabilitadoRespuesta[]>('/dias_habilitados', {
    params: { select: SELECT_DIA, and: `(fecha.gte.${desde},fecha.lte.${hasta})`, order: 'fecha.asc' },
  });
  return data.map(mapDiaEspecial);
};

/**
 * Habilita, cambia el horario o cierra una fecha (una fila por fecha: si ya existe, se
 * reemplaza). Cerrada, guarda igual unas horas válidas por el check de la tabla.
 */
export const guardarDiaEspecial = async (dia: DiaEspecial): Promise<DiaEspecial> => {
  const { data } = await supabaseApi.post<DiaHabilitadoRespuesta[]>(
    '/dias_habilitados',
    {
      fecha: dia.fecha,
      abierto: dia.abierto,
      apertura: horaTexto(dia.abreMin),
      cierre: horaTexto(dia.cierraMin),
      nota: dia.nota,
    },
    {
      params: { on_conflict: 'fecha', select: SELECT_DIA },
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    },
  );
  const fila = data[0];
  if (!fila) throw new Error('No se guardó el horario.');
  return mapDiaEspecial(fila);
};

/** Quita la excepción: la fecha vuelve a su horario normal (o a cerrada si es domingo o festivo). */
export const quitarDiaEspecial = async (fecha: string): Promise<void> => {
  const { data } = await supabaseApi.delete<DiaHabilitadoRespuesta[]>('/dias_habilitados', {
    params: { fecha: `eq.${fecha}`, select: 'fecha' },
    headers: devolverFila,
  });
  if (data.length === 0) throw new Error('No encontramos esa excepción.');
};

/** Bloqueos que aún no terminan, por fecha de inicio. */
export const getBloqueosVigentes = async (ahoraIso: string): Promise<Bloqueo[]> => {
  const { data } = await supabaseApi.get<BloqueoRespuesta[]>('/bloqueos', {
    params: { select: SELECT_BLOQUEO, fin: `gt.${ahoraIso}`, order: 'inicio.asc' },
  });
  return data.map(mapBloqueo);
};

export interface NuevoBloqueo {
  /** null = todo el local. */
  profesionalId: string | null;
  inicio: string;
  fin: string;
  motivo: string;
}

export const crearBloqueo = async (bloqueo: NuevoBloqueo): Promise<Bloqueo> => {
  const { data } = await supabaseApi.post<BloqueoRespuesta[]>(
    '/bloqueos',
    {
      profesional_id: bloqueo.profesionalId,
      inicio: bloqueo.inicio,
      fin: bloqueo.fin,
      motivo: bloqueo.motivo,
    },
    { params: { select: SELECT_BLOQUEO }, headers: devolverFila },
  );
  const fila = data[0];
  if (!fila) throw new Error('No se guardó el bloqueo.');
  return mapBloqueo(fila);
};

export const quitarBloqueo = async (id: string): Promise<void> => {
  const { data } = await supabaseApi.delete<{ id: string }[]>('/bloqueos', {
    params: { id: `eq.${id}`, select: 'id' },
    headers: devolverFila,
  });
  if (data.length === 0) throw new Error('No encontramos ese bloqueo.');
};
