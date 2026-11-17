// Revisión del administrador (RF-25, RF-28, RN-09, RN-15, RN-16, D-27, D-28, D-42).
// Funciones puras: la pantalla solo las llama. Dinero en pesos COP enteros.
import { FINANZAS } from '@/config/negocio';
import { aBogota, sumarDias } from '@/lib/disponibilidad';
import {
  calcularNoAsistencia,
  calcularSaldo,
  consecuenciaCancelacion,
  puedeReagendarNoAsistida,
} from '@/lib/finanzas';
import type { EstadoCita } from '@/types/entidades';

export interface EfectoRevision {
  /** Anticipo aprobado de la cita si se confirma el comprobante. */
  anticipoSiAprueba: number;
  saldoSiAprueba: number;
  saldoSiRechaza: number;
}

/**
 * RN-09: lo que cambia al confirmar o rechazar un comprobante. anticipoAprobado es lo que ya
 * estaba aprobado en la cita (con el índice de un vigente por cita, normalmente 0).
 */
export function efectoRevision(
  totalCita: number,
  anticipoAprobado: number,
  montoComprobante: number,
): EfectoRevision {
  const anticipoSiAprueba = anticipoAprobado + montoComprobante;
  return {
    anticipoSiAprueba,
    saldoSiAprueba: calcularSaldo(totalCita, anticipoSiAprueba),
    saldoSiRechaza: calcularSaldo(totalCita, anticipoAprobado),
  };
}

/** Largo máximo del motivo de rechazo que ve el cliente. */
export const NOTA_RECHAZO_MAX = 200;

export type ValidacionNota = { ok: true; nota: string } | { ok: false; error: string };

/** El cliente necesita saber por qué se rechazó: el motivo es obligatorio. */
export function validarNotaRechazo(entrada: string): ValidacionNota {
  const nota = entrada.trim();
  if (nota === '') return { ok: false, error: 'Escribe el motivo del rechazo.' };
  if (nota.length > NOTA_RECHAZO_MAX) {
    return { ok: false, error: `El motivo admite hasta ${NOTA_RECHAZO_MAX} caracteres.` };
  }
  return { ok: true, nota };
}

/** Estados de la cita que pueden dejar una devolución pendiente (RF-28). */
export const ESTADOS_CON_DEVOLUCION = ['cancelada_a_tiempo', 'cancelada_tarde', 'no_asistida'] as const;
export type EstadoConDevolucion = (typeof ESTADOS_CON_DEVOLUCION)[number];

export const tieneDevolucion = (estado: EstadoCita): estado is EstadoConDevolucion =>
  (ESTADOS_CON_DEVOLUCION as readonly EstadoCita[]).includes(estado);

export interface DesgloseDevolucion {
  /** Multa que se descontó del anticipo (D-28). */
  multaDescontada: number;
  /** Lo que se retiene por devolver (hasta $2.000). */
  costoDevolucion: number;
  /** Lo que se transfiere al cliente. */
  devolucion: number;
}

/**
 * RN-15 y RN-16 (D-27): cuánto se devuelve del anticipo aprobado y por qué.
 * - Cancelada (a tiempo o tarde) sin reagendar: consecuenciaCancelacion con lo que decidió la
 *   base (anticipo − multa si fue tarde − $2.000, mínimo 0).
 * - No asistida: sobrante (anticipo − multa) − $2.000, mínimo 0.
 */
export function desgloseDevolucion(
  estado: EstadoConDevolucion,
  anticipoAprobado: number,
): DesgloseDevolucion {
  if (estado === 'no_asistida') {
    const { multaCubierta, anticipoRestante } = calcularNoAsistencia(anticipoAprobado);
    const costoDevolucion = Math.min(anticipoRestante, FINANZAS.COSTO_DEVOLUCION);
    return {
      multaDescontada: multaCubierta,
      costoDevolucion,
      devolucion: anticipoRestante - costoDevolucion,
    };
  }
  const r = consecuenciaCancelacion({
    anticipoAprobado,
    tardia: estado === 'cancelada_tarde',
    reagenda: false,
  });
  return { multaDescontada: r.multaCubierta, costoDevolucion: r.costoDevolucion, devolucion: r.devolucion };
}

/**
 * RN-16 y D-27: una cita no asistida se puede reagendar hasta 2 días después de su fecha
 * (Bogotá). Mientras tanto el cliente decide; vencido el plazo, la devolución queda pendiente.
 */
export function plazoNoAsistida(inicioIso: string, ahoraMs: number): { enPlazo: boolean; hasta: string } {
  const fechaCita = aBogota(new Date(inicioIso)).fecha;
  const hoy = aBogota(new Date(ahoraMs)).fecha;
  return {
    enPlazo: puedeReagendarNoAsistida(fechaCita, hoy),
    hasta: sumarDias(fechaCita, FINANZAS.PLAZO_REAGENDAR_NO_ASISTIDA_DIAS),
  };
}
