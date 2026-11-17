// Reglas de la agenda del panel (RF-21, RF-22, RF-23, RN-05, D-08, D-31). Funciones puras:
// reciben "ahora" en milisegundos para poder probarlas. Las horas se leen en hora de Bogotá
// con aBogota, sin depender de la zona del teléfono.
import { HORARIO, NEGOCIO } from '@/config/negocio';
import { aBogota, lunesDe, sumarDias } from '@/lib/disponibilidad';
import { formatoHora } from '@/lib/fechas';
import type { EstadoCita } from '@/types/entidades';

const MS_MINUTO = 60 * 1000;

/** Lo que estas reglas necesitan de una cita (sirve para Cita y para CitaAgenda). */
type CitaConEstado = { estado: EstadoCita; inicio: string };

/** Instante (ms) en que vence la tolerancia: inicio + 10 minutos (RN-05). */
export const finTolerancia = (inicioIso: string): number =>
  Date.parse(inicioIso) + NEGOCIO.toleranciaMinutos * MS_MINUTO;

/** La cita sigue esperando la marca: confirmada o ya guardada como por marcar. */
const sinMarcar = (estado: EstadoCita): boolean => estado === 'confirmada' || estado === 'por_marcar';

/**
 * D-31: una cita 'confirmada' cuyo inicio + 10 minutos ya pasó se muestra "Por marcar".
 * La base no cambia el estado sola; si ya viene 'por_marcar', también lo está.
 */
export const estaPorMarcar = (cita: CitaConEstado, ahoraMs: number): boolean =>
  cita.estado === 'por_marcar' || (cita.estado === 'confirmada' && ahoraMs >= finTolerancia(cita.inicio));

/** Estado que se muestra: el de la base, salvo "Por marcar", que se calcula al leer (D-31). */
export const estadoVisible = (cita: CitaConEstado, ahoraMs: number): EstadoCita =>
  estaPorMarcar(cita, ahoraMs) ? 'por_marcar' : cita.estado;

/** RF-23: "Asistió" se puede marcar desde la hora de inicio (igual que el trigger de la base). */
export const puedeMarcarAsistida = (cita: CitaConEstado, ahoraMs: number): boolean =>
  sinMarcar(cita.estado) && ahoraMs >= Date.parse(cita.inicio);

/** RF-23 y D-08: "No asistió" solo cuando venció la tolerancia de 10 minutos. */
export const puedeMarcarNoAsistida = (cita: CitaConEstado, ahoraMs: number): boolean =>
  sinMarcar(cita.estado) && ahoraMs >= finTolerancia(cita.inicio);

/** Hora de Bogotá de un instante ISO: "9:15 a. m.". */
export const horaBogota = (iso: string): string => formatoHora(aBogota(new Date(iso)).minutos);

/** Fecha de Bogotá ('YYYY-MM-DD') de un instante ISO. */
export const fechaBogota = (iso: string): string => aBogota(new Date(iso)).fecha;

// ---------- Rango de la agenda ----------

export type VistaAgenda = 'dia' | 'semana';

/** Fechas de Bogotá: desde (incluida) hasta (excluida). */
export interface RangoAgenda {
  desde: string;
  hasta: string;
}

/** El día de la fecha o la semana (lunes a domingo) que la contiene. */
export const rangoAgenda = (vista: VistaAgenda, fecha: string): RangoAgenda => {
  const desde = vista === 'dia' ? fecha : lunesDe(fecha);
  return { desde, hasta: sumarDias(desde, vista === 'dia' ? 1 : 7) };
};

/** Mueve la fecha elegida un día o una semana hacia adelante (+1) o hacia atrás (-1). */
export const moverFecha = (vista: VistaAgenda, fecha: string, pasos: number): string =>
  sumarDias(fecha, pasos * (vista === 'dia' ? 1 : 7));

/** Fechas del rango, en orden. */
export const fechasDelRango = ({ desde, hasta }: RangoAgenda): string[] => {
  const fechas: string[] = [];
  for (let f = desde; f < hasta; f = sumarDias(f, 1)) fechas.push(f);
  return fechas;
};

// ---------- Filas de un día ----------

export type FilaAgenda<T> = { tipo: 'cita'; cita: T } | { tipo: 'almuerzo' };

const inicioAlmuerzo = (() => {
  const [h = '0', m = '0'] = HORARIO.almuerzo.inicio.split(':');
  return Number(h) * 60 + Number(m);
})();

/**
 * Citas de un día ordenadas por hora, con la banda del almuerzo (12:00 a 13:00, sin citas)
 * en su lugar. El almuerzo se muestra siempre, aunque el día no tenga citas.
 */
export const filasDelDia = <T extends { inicio: string }>(citas: readonly T[]): FilaAgenda<T>[] => {
  const ordenadas = [...citas].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  const minutos = (c: T) => aBogota(new Date(c.inicio)).minutos;
  const antes = ordenadas.filter((c) => minutos(c) < inicioAlmuerzo);
  const despues = ordenadas.filter((c) => minutos(c) >= inicioAlmuerzo);
  return [
    ...antes.map((cita) => ({ tipo: 'cita' as const, cita })),
    { tipo: 'almuerzo' as const },
    ...despues.map((cita) => ({ tipo: 'cita' as const, cita })),
  ];
};

/** Agrupa las citas por su fecha de Bogotá, para la vista de semana. */
export const citasPorDia = <T extends { inicio: string }>(
  citas: readonly T[],
  fechas: readonly string[],
): { fecha: string; citas: T[] }[] =>
  fechas.map((fecha) => ({ fecha, citas: citas.filter((c) => fechaBogota(c.inicio) === fecha) }));
