import type { DiaHabilitadoRespuesta } from '@/types/api';
import type { OcupacionSemana } from '@/types/entidades';

/** "HH:MM:SS" (o "HH:MM") a minutos desde medianoche. */
export const horaAMinutos = (hora: string): number => {
  const [h = '0', m = '0'] = hora.split(':');
  return Number(h) * 60 + Number(m);
};

export const mapDiaHabilitado = (
  dia: DiaHabilitadoRespuesta,
): OcupacionSemana['especiales'][number] => ({
  fecha: dia.fecha,
  abierto: dia.abierto,
  abreMin: horaAMinutos(dia.apertura),
  cierraMin: horaAMinutos(dia.cierre),
});
