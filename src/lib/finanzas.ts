// Cálculos de dinero de Señorío Barber (RN-06, RN-07, RN-08, RN-09, RN-15).
// Sigue la especificación de multas y devoluciones del proyecto (RN-05 a RN-09, RN-15, RN-16). Todo en pesos COP enteros. Funciones puras.
// Cambios frente a la referencia: PARAMS vive en src/config/negocio.ts, formatoCOP se reutiliza
// de src/lib/dinero.ts y los tipos son estrictos (noUncheckedIndexedAccess).
import { FINANZAS as PARAMS } from '@/config/negocio';
import { formatoCOP } from '@/lib/dinero';

export { formatoCOP, PARAMS };

export type Validacion = { ok: true; valor: number } | { ok: false; error: string };

/** Convierte lo que escribe la persona ("20.000", "$ 20000") a pesos enteros. */
export function parsearPesos(entrada: unknown): Validacion {
  if (typeof entrada === 'number') {
    if (!Number.isFinite(entrada) || !Number.isInteger(entrada)) {
      return { ok: false, error: 'Ingresa un valor entero en pesos.' };
    }
    if (entrada < 0) return { ok: false, error: 'El valor no puede ser negativo.' };
    return { ok: true, valor: entrada };
  }
  if (typeof entrada !== 'string') return { ok: false, error: 'Ingresa un valor.' };
  const limpio = entrada.replace(/[\s$]/g, '');
  if (limpio === '') return { ok: false, error: 'Ingresa un valor.' };
  if (limpio.startsWith('-')) return { ok: false, error: 'El valor no puede ser negativo.' };
  // En Colombia el punto separa miles: "20.000" es veinte mil.
  if (!/^(\d+|\d{1,3}(\.\d{3})+)$/.test(limpio)) {
    return { ok: false, error: 'Usa solo números, por ejemplo 20.000.' };
  }
  return { ok: true, valor: Number(limpio.replace(/\./g, '')) };
}

/** RN-08: el abono no puede ser menor a $10.000 ni mayor al total de la cita. */
export function validarAbono(entrada: unknown, totalCita: number): Validacion {
  if (!Number.isInteger(totalCita) || totalCita <= 0) {
    return { ok: false, error: 'El total de la cita no es válido.' };
  }
  const r = parsearPesos(entrada);
  if (!r.ok) return r;
  if (r.valor < PARAMS.ABONO_MINIMO) {
    return { ok: false, error: `El abono mínimo es ${formatoCOP(PARAMS.ABONO_MINIMO)}.` };
  }
  if (r.valor > totalCita) {
    return {
      ok: false,
      error: `El abono no puede superar el total de la cita (${formatoCOP(totalCita)}).`,
    };
  }
  return r;
}

export interface ItemCobrable {
  precio: number;
  duracionMin: number;
}

/** RN-03: precio y duración de la cita = suma de servicios y adicionales. */
export function calcularTotalCita(items: ItemCobrable[]): { total: number; duracionMin: number } {
  if (items.length === 0) throw new RangeError('Elige al menos un servicio.');
  let total = 0;
  let duracionMin = 0;
  for (const it of items) {
    const valido =
      Number.isInteger(it.precio) &&
      it.precio >= 0 &&
      Number.isInteger(it.duracionMin) &&
      it.duracionMin >= 0;
    if (!valido) throw new RangeError('Servicio con precio o duración inválidos.');
    total += it.precio;
    duracionMin += it.duracionMin;
  }
  return { total, duracionMin };
}

/** Saldo por pagar: solo cuenta el anticipo que el administrador ya aprobó (RN-09). */
export function calcularSaldo(totalCita: number, anticipoAprobado: number): number {
  return Math.max(0, totalCita - anticipoAprobado);
}

function validarAnticipo(a: number): void {
  if (!Number.isInteger(a) || a < 0) {
    throw new RangeError('El anticipo debe ser un entero en pesos, mayor o igual a 0.');
  }
}

export function esCancelacionTardia(horasAntes: number): boolean {
  if (!Number.isFinite(horasAntes)) throw new RangeError('Las horas de anticipación no son válidas.');
  return horasAntes < PARAMS.HORAS_SIN_MULTA;
}

export interface EntradaCancelacion {
  /** Solo anticipos confirmados por el administrador. */
  anticipoAprobado: number;
  /** Horas entre el momento de cancelar y el inicio de la cita (puede ser negativo). */
  horasAntes: number;
  reagenda: boolean;
}

export interface ResultadoCancelacion {
  multa: number;
  /** Parte de la multa que se descuenta del anticipo. */
  multaCubierta: number;
  /** Lo que queda por pagar; bloquea la siguiente reserva (RN-07). */
  multaPendiente: number;
  /** Lo que se retiene al devolver (hasta $2.000). */
  costoDevolucion: number;
  /** Dinero que se devuelve al cliente el mismo día. */
  devolucion: number;
  /** Anticipo que pasa a la nueva cita al reagendar. */
  anticipoTrasladado: number;
}

/** RN-06 y RN-15, a partir de las horas que faltan para la cita. */
export function calcularCancelacion(e: EntradaCancelacion): ResultadoCancelacion {
  return consecuenciaCancelacion({
    anticipoAprobado: e.anticipoAprobado,
    tardia: esCancelacionTardia(e.horasAntes),
    reagenda: e.reagenda,
  });
}

export interface EntradaConsecuencia {
  anticipoAprobado: number;
  /** true si se cancela con menos de 4 horas (o así lo decidió la base: 'cancelada_tarde'). */
  tardia: boolean;
  reagenda: boolean;
}

/**
 * RN-06 y RN-15 cuando ya se sabe si la cancelación es tardía. La pantalla de cancelar la usa
 * con el resultado de la base, que manda sobre el cálculo previo (RN-14).
 */
export function consecuenciaCancelacion(e: EntradaConsecuencia): ResultadoCancelacion {
  validarAnticipo(e.anticipoAprobado);
  const tardia = e.tardia;
  if (e.reagenda && tardia) {
    throw new RangeError('No se puede reagendar con menos de 4 horas de anticipación.');
  }
  const multa = tardia ? PARAMS.MULTA : 0;
  const multaCubierta = Math.min(e.anticipoAprobado, multa);
  const multaPendiente = multa - multaCubierta;
  const restante = e.anticipoAprobado - multaCubierta;

  if (e.reagenda) {
    return {
      multa,
      multaCubierta,
      multaPendiente,
      costoDevolucion: 0,
      devolucion: 0,
      anticipoTrasladado: restante,
    };
  }
  const costoDevolucion = Math.min(restante, PARAMS.COSTO_DEVOLUCION);
  return {
    multa,
    multaCubierta,
    multaPendiente,
    costoDevolucion,
    devolucion: restante - costoDevolucion,
    anticipoTrasladado: 0,
  };
}

export interface ResultadoNoAsistencia {
  multa: number;
  multaCubierta: number;
  multaPendiente: number;
  /** Anticipo que sigue disponible (p. ej. para reagendar dentro del plazo). */
  anticipoRestante: number;
}

/** RN-05 y RN-06: la cita pasó los 10 minutos de tolerancia sin llegada. */
export function calcularNoAsistencia(anticipoAprobado: number): ResultadoNoAsistencia {
  validarAnticipo(anticipoAprobado);
  const multa = PARAMS.MULTA;
  const multaCubierta = Math.min(anticipoAprobado, multa);
  return {
    multa,
    multaCubierta,
    multaPendiente: multa - multaCubierta,
    anticipoRestante: anticipoAprobado - multaCubierta,
  };
}

/** RN-07: con multa pendiente no se puede reservar. */
export function puedeReservar(multaPendienteTotal: number): boolean {
  return multaPendienteTotal <= 0;
}

const aUTC = (fecha: string): number => {
  const [a = NaN, m = NaN, d = NaN] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};

/** RF-14: una cita no asistida se reagenda hasta 2 días después de su fecha (fechas 'YYYY-MM-DD' de Bogotá). */
export function puedeReagendarNoAsistida(fechaCita: string, hoy: string): boolean {
  const dias = Math.round((aUTC(hoy) - aUTC(fechaCita)) / 86_400_000);
  return dias >= 0 && dias <= PARAMS.PLAZO_REAGENDAR_NO_ASISTIDA_DIAS;
}
