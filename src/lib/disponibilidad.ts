// Franjas reservables de Señorío Barber (RN-01 a RN-04, RN-10, RF-04).
// Sigue la especificación de disponibilidad del proyecto (D-07, D-24). Funciones puras: no consultan red ni reloj.
// Todo se calcula en minutos desde medianoche, hora de Bogotá (UTC-5 fijo, sin horario de verano).
// Cambios frente a la referencia: CONFIG vive en src/config/negocio.ts, tipos estrictos
// (noUncheckedIndexedAccess), horarios especiales por fecha (D-09) y agruparPorDia.
import { DISPONIBILIDAD as CONFIG } from '@/config/negocio';

export { CONFIG };

export type EstadoFranja = 'libre' | 'ocupada' | 'pasada' | 'bloqueada';

export interface Intervalo {
  inicioMin: number;
  finMin: number;
}
export interface Franja extends Intervalo {
  estado: EstadoFranja;
}
/** Momento en hora de Bogotá: fecha 'YYYY-MM-DD' y minutos desde medianoche. */
export interface Instante {
  fecha: string;
  minutos: number;
}
export interface DiaDisponibilidad {
  fecha: string;
  abierto: boolean;
  franjas: Franja[];
}
export interface VentanaDia {
  abreMin: number;
  cierraMin: number;
}
/** Fila de dias_habilitados: reemplaza el horario normal de esa fecha (D-09, D-23). */
export interface HorarioEspecial extends VentanaDia {
  abierto: boolean;
}

// ---------- Fechas (sin depender de la zona horaria del teléfono) ----------

export function aBogota(instante: Date): Instante {
  const t = new Date(instante.getTime() + CONFIG.OFFSET_BOGOTA_MIN * 60_000);
  return { fecha: t.toISOString().slice(0, 10), minutos: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

const aUTC = (fecha: string): number => {
  const [a = NaN, m = NaN, d = NaN] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};

/** 0 = domingo ... 6 = sábado. */
export function diaSemana(fecha: string): number {
  return new Date(aUTC(fecha)).getUTCDay();
}

export function sumarDias(fecha: string, dias: number): string {
  return new Date(aUTC(fecha) + dias * 86_400_000).toISOString().slice(0, 10);
}

export function lunesDe(fecha: string): string {
  const d = diaSemana(fecha);
  return sumarDias(fecha, d === 0 ? -6 : 1 - d);
}

/** Convierte una cita guardada en UTC al intervalo del día en Bogotá. */
export function intervaloDeCita(inicio: Date, fin: Date): Intervalo & { fecha: string } {
  const a = aBogota(inicio);
  const b = aBogota(fin);
  return { fecha: a.fecha, inicioMin: a.minutos, finMin: b.minutos };
}

/** Instante UTC (ISO) de una franja: fecha de Bogotá + minutos desde medianoche. Lo inverso de aBogota. */
export function instanteDeFranja(fecha: string, minutos: number): string {
  return new Date(aUTC(fecha) + (minutos - CONFIG.OFFSET_BOGOTA_MIN) * 60_000).toISOString();
}

/**
 * Separa las franjas de un día en las de antes y después del almuerzo, para que la pantalla
 * dibuje el almuerzo como un bloque "No disponible" entre ellas (la función no lo devuelve).
 */
export function partirPorAlmuerzo(franjas: readonly Franja[]): { antes: Franja[]; despues: Franja[] } {
  return {
    antes: franjas.filter((f) => f.finMin <= CONFIG.ALMUERZO.inicioMin),
    despues: franjas.filter((f) => f.finMin > CONFIG.ALMUERZO.inicioMin),
  };
}

/** Agrupa intervalos guardados en UTC (ISO) por fecha de Bogotá, para calcularSemana. */
export function agruparPorDia(
  intervalos: readonly { inicio: string; fin: string }[],
): Record<string, Intervalo[]> {
  const porDia: Record<string, Intervalo[]> = {};
  for (const { inicio, fin } of intervalos) {
    const { fecha, inicioMin, finMin } = intervaloDeCita(new Date(inicio), new Date(fin));
    (porDia[fecha] ??= []).push({ inicioMin, finMin });
  }
  return porDia;
}

// ---------- Reglas ----------

/** Intervalos semiabiertos [inicio, fin): una cita que termina a las 13:00 no choca con una que empieza a las 13:00. */
export const seSolapan = (a: Intervalo, b: Intervalo): boolean =>
  a.inicioMin < b.finMin && b.inicioMin < a.finMin;

/**
 * Ventana de atención del día, o null si está cerrado (RN-01, RN-10).
 * Un horario especial de esa fecha manda sobre todo lo demás, como en validar_horario_cita.
 */
export function ventanaDelDia(
  fecha: string,
  festivos: ReadonlySet<string>,
  diasHabilitados: ReadonlySet<string>,
  especiales?: ReadonlyMap<string, HorarioEspecial>,
): VentanaDia | null {
  const especial = especiales?.get(fecha);
  if (especial) {
    return especial.abierto ? { abreMin: especial.abreMin, cierraMin: especial.cierraMin } : null;
  }
  const dow = diaSemana(fecha);
  if (dow === 0 || festivos.has(fecha)) {
    return diasHabilitados.has(fecha) ? CONFIG.HABILITADO : null;
  }
  return dow <= 4 ? CONFIG.LUN_JUE : CONFIG.VIE_SAB;
}

export interface EntradaDia {
  fecha: string;
  /** Suma de la duración de los servicios elegidos (RN-03). */
  duracionMin: number;
  festivos: ReadonlySet<string>;
  diasHabilitados: ReadonlySet<string>;
  /** Horarios especiales por fecha (dias_habilitados con horario propio o cerrado). */
  especiales?: ReadonlyMap<string, HorarioEspecial>;
  /** Citas activas (no canceladas) del profesional ese día (RN-02). */
  citas: Intervalo[];
  /** Bloqueos del administrador ese día (RF-24). */
  bloqueos: Intervalo[];
  ahora: Instante;
}

function estadoDe(cand: Intervalo, e: EntradaDia): EstadoFranja {
  const esPasada =
    e.fecha < e.ahora.fecha ||
    (e.fecha === e.ahora.fecha && cand.inicioMin < e.ahora.minutos + CONFIG.ANTICIPACION_MIN);
  if (esPasada) return 'pasada';
  if (e.bloqueos.some((b) => seSolapan(cand, b))) return 'bloqueada';
  if (e.citas.some((c) => seSolapan(cand, c))) return 'ocupada';
  return 'libre';
}

/**
 * Franjas de un día para un profesional. No incluye las que cruzan el almuerzo
 * ni las que terminan después del cierre (RN-01); la pantalla dibuja el almuerzo aparte.
 */
export function calcularDia(e: EntradaDia): DiaDisponibilidad {
  if (!Number.isInteger(e.duracionMin) || e.duracionMin <= 0) {
    throw new RangeError('La duración debe ser un número entero de minutos mayor a 0.');
  }
  const ventana = ventanaDelDia(e.fecha, e.festivos, e.diasHabilitados, e.especiales);
  if (!ventana) return { fecha: e.fecha, abierto: false, franjas: [] };

  const franjas: Franja[] = [];
  for (let inicio = ventana.abreMin; inicio + e.duracionMin <= ventana.cierraMin; inicio += CONFIG.PASO_MIN) {
    const cand: Intervalo = { inicioMin: inicio, finMin: inicio + e.duracionMin };
    if (seSolapan(cand, CONFIG.ALMUERZO)) continue;
    franjas.push({ ...cand, estado: estadoDe(cand, e) });
  }
  return { fecha: e.fecha, abierto: true, franjas };
}

export interface EntradaSemana extends Omit<EntradaDia, 'fecha' | 'citas' | 'bloqueos'> {
  /** Lunes de la semana, 'YYYY-MM-DD'. */
  lunes: string;
  citasPorDia: Record<string, Intervalo[]>;
  bloqueosPorDia: Record<string, Intervalo[]>;
}

/** Siete días, de lunes a domingo (RF-04). */
export function calcularSemana(e: EntradaSemana): DiaDisponibilidad[] {
  if (diaSemana(e.lunes) !== 1) throw new RangeError('La semana debe empezar en lunes.');
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(e.lunes, i);
    return calcularDia({
      fecha,
      duracionMin: e.duracionMin,
      festivos: e.festivos,
      diasHabilitados: e.diasHabilitados,
      especiales: e.especiales,
      ahora: e.ahora,
      citas: e.citasPorDia[fecha] ?? [],
      bloqueos: e.bloqueosPorDia[fecha] ?? [],
    });
  });
}

/**
 * RF-14: quita de lo ocupado la cita que se está reagendando (mismo inicio y fin), para que
 * el cliente pueda moverla a una franja que se cruza con su horario actual. La base lo
 * permite porque libera la franja original antes de crear la nueva.
 */
export function sinIntervalo<T extends { inicio: string; fin: string }>(
  ocupadas: readonly T[],
  excluir: { inicio: string; fin: string } | null,
): T[] {
  if (!excluir) return [...ocupadas];
  const inicio = Date.parse(excluir.inicio);
  const fin = Date.parse(excluir.fin);
  return ocupadas.filter((o) => Date.parse(o.inicio) !== inicio || Date.parse(o.fin) !== fin);
}

/** true si la franja elegida sigue libre en la semana calculada (otro cliente pudo tomarla). */
export const franjaLibre = (
  dias: readonly DiaDisponibilidad[],
  fecha: string,
  inicioMin: number,
): boolean =>
  dias.some(
    (d) => d.fecha === fecha && d.franjas.some((f) => f.inicioMin === inicioMin && f.estado === 'libre'),
  );
