// Mappers de días de trabajo y bloqueos (RF-24): de las filas de Supabase (snake_case) al
// modelo de la app. Las horas "HH:MM:SS" de Postgres pasan a minutos desde medianoche.
import { horaAMinutos } from '@/models/disponibilidad.mapper';
import type { BloqueoRespuesta, DiaHabilitadoRespuesta } from '@/types/api';
import type { Bloqueo, DiaEspecial } from '@/types/entidades';

export const SELECT_DIA = 'fecha,abierto,apertura,cierre,nota';
export const SELECT_BLOQUEO = 'id,profesional_id,inicio,fin,motivo,profesionales(nombre)';

export const mapDiaEspecial = (dia: DiaHabilitadoRespuesta): DiaEspecial => ({
  fecha: dia.fecha,
  abierto: dia.abierto,
  abreMin: horaAMinutos(dia.apertura),
  cierraMin: horaAMinutos(dia.cierre),
  nota: dia.nota?.trim() || null,
});

export const mapBloqueo = (bloqueo: BloqueoRespuesta): Bloqueo => ({
  id: bloqueo.id,
  profesionalId: bloqueo.profesional_id,
  // Un bloqueo con profesional cuyo nombre no llegó (RLS) se muestra como "Profesional".
  profesional: bloqueo.profesional_id ? (bloqueo.profesionales?.nombre ?? 'Profesional') : null,
  inicio: bloqueo.inicio,
  fin: bloqueo.fin,
  motivo: bloqueo.motivo?.trim() || 'Sin motivo',
});
