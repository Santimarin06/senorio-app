// Reglas de tiempo para cancelar una cita (RF-09). Funciones puras: reciben "ahora" en
// milisegundos para poder probarlas. Trabajan con instantes absolutos (Date.parse de ISO en
// UTC), así que no dependen de la zona horaria del teléfono.
import { NEGOCIO } from '@/config/negocio';
import type { Cita } from '@/types/entidades';

const MS_HORA = 60 * 60 * 1000;

/**
 * Se puede cancelar una cita confirmada (o por marcar) que aún no empieza. Es el mismo
 * criterio de la función cancelar_cita de la base.
 */
export const puedeCancelar = (cita: Pick<Cita, 'estado' | 'inicio'>, ahoraMs: number): boolean =>
  (cita.estado === 'confirmada' || cita.estado === 'por_marcar') && Date.parse(cita.inicio) > ahoraMs;

/** Horas (con decimales) entre ahora y el inicio de la cita. Negativo si ya empezó. */
export const horasHasta = (inicioIso: string, ahoraMs: number): number =>
  (Date.parse(inicioIso) - ahoraMs) / MS_HORA;

/** "Faltan 3 h 20 min", "Faltan 45 min", "Faltan 2 días y 4 h". */
export const textoTiempoRestante = (horas: number): string => {
  if (!Number.isFinite(horas) || horas <= 0) return 'La cita ya empezó';
  const totalMin = Math.floor(horas * 60);
  const dias = Math.floor(totalMin / (24 * 60));
  const h = Math.floor((totalMin % (24 * 60)) / 60);
  const min = totalMin % 60;
  if (dias > 0) {
    const textoDias = dias === 1 ? '1 día' : `${dias} días`;
    return h > 0 ? `Faltan ${textoDias} y ${h} h` : `Faltan ${textoDias}`;
  }
  if (h > 0) return min > 0 ? `Faltan ${h} h ${min} min` : `Faltan ${h} h`;
  return `Faltan ${min} min`;
};

/** Último instante (ISO, UTC) para cancelar sin multa: inicio − 4 horas (RN-06). */
export const limiteSinMulta = (inicioIso: string): string =>
  new Date(Date.parse(inicioIso) - NEGOCIO.horasMinimasCancelarSinMulta * MS_HORA).toISOString();
