// Reagendar una cita (RF-14, RN-15, RN-16, D-05, D-26, D-27, D-45). Funciones puras: reciben
// "ahora" en milisegundos y repiten las reglas de la función reagendar_cita de la base, que
// es la que decide. Dinero en pesos COP enteros.
import { FINANZAS } from '@/config/negocio';
import { horasHasta } from '@/lib/cancelacion';
import { formatoCOP } from '@/lib/dinero';
import { calcularOpcionesNoAsistencia } from '@/lib/finanzas';
import { plazoNoAsistida } from '@/lib/revision';
import type { Cita } from '@/types/entidades';

export type CitaReagendable = Pick<
  Cita,
  'estado' | 'inicio' | 'anticipoAprobado' | 'devolucionElegidaEn' | 'devolucionRegistrada'
>;

export type OpcionReagendar =
  | { puede: true; caso: 'futura'; trasladado: number; diferencia: 0 }
  | { puede: true; caso: 'no_asistida'; trasladado: number; diferencia: number; hasta: string }
  | { puede: false; motivo: string };

const motivoMulta = (monto: number): string =>
  `Tienes una multa pendiente de ${formatoCOP(monto)}. Págala o habla con el local para reagendar.`;

/**
 * RF-14: si la cita se puede reagendar y qué anticipo pasa a la nueva.
 * - Futura confirmada con 4 h o más: pasa todo el anticipo aprobado.
 * - No asistida dentro de 2 días (hora de Bogotá), sin devolución elegida ni registrada:
 *   pasa el sobrante y falta la diferencia hasta $10.000 (RN-16, D-05).
 * Con una multa pendiente no se reagenda (RN-07, D-26).
 */
export function opcionReagendar(
  cita: CitaReagendable,
  ahoraMs: number,
  multaPendienteTotal: number,
): OpcionReagendar {
  if (cita.estado === 'reagendada') return { puede: false, motivo: 'Esta cita ya fue reagendada.' };

  if (cita.estado === 'confirmada') {
    const horas = horasHasta(cita.inicio, ahoraMs);
    if (horas < FINANZAS.HORAS_SIN_MULTA) {
      return {
        puede: false,
        motivo:
          horas > 0
            ? `Faltan menos de ${FINANZAS.HORAS_SIN_MULTA} horas para tu cita: ya no se puede reagendar.`
            : 'Esta cita ya pasó y no se puede reagendar.',
      };
    }
    if (multaPendienteTotal > 0) return { puede: false, motivo: motivoMulta(multaPendienteTotal) };
    return { puede: true, caso: 'futura', trasladado: cita.anticipoAprobado, diferencia: 0 };
  }

  if (cita.estado === 'no_asistida') {
    if (cita.devolucionRegistrada) {
      return { puede: false, motivo: 'El local ya registró la devolución de tu anticipo.' };
    }
    if (cita.devolucionElegidaEn) {
      return {
        puede: false,
        motivo: 'Elegiste la devolución de tu anticipo: esta cita ya no se reagenda.',
      };
    }
    const plazo = plazoNoAsistida(cita.inicio, ahoraMs);
    if (!plazo.enPlazo) {
      return {
        puede: false,
        motivo: `Venció el plazo de ${FINANZAS.PLAZO_REAGENDAR_NO_ASISTIDA_DIAS} días para reagendar esta cita.`,
      };
    }
    if (multaPendienteTotal > 0) return { puede: false, motivo: motivoMulta(multaPendienteTotal) };
    const { trasladado, diferencia } = calcularOpcionesNoAsistencia(cita.anticipoAprobado);
    return { puede: true, caso: 'no_asistida', trasladado, diferencia, hasta: plazo.hasta };
  }

  return { puede: false, motivo: 'Esta cita ya no se puede reagendar.' };
}

export type EleccionNoAsistencia =
  /** Dentro del plazo y sin elegir: puede pedir devolución o reagendar. */
  | 'por_elegir'
  /** Eligió devolución: el local la registra en Revisión. */
  | 'devolucion_elegida'
  /** No eligió en 2 días: queda como devolución pendiente (D-27). */
  | 'devolucion_pendiente'
  /** El administrador ya registró la devolución. */
  | 'devolucion_registrada';

/** RN-16 y D-27: en qué punto está el sobrante de una cita no asistida con anticipo. */
export function estadoEleccionNoAsistencia(
  cita: Pick<CitaReagendable, 'inicio' | 'devolucionElegidaEn' | 'devolucionRegistrada'>,
  ahoraMs: number,
): EleccionNoAsistencia {
  if (cita.devolucionRegistrada) return 'devolucion_registrada';
  if (cita.devolucionElegidaEn) return 'devolucion_elegida';
  return plazoNoAsistida(cita.inicio, ahoraMs).enPlazo ? 'por_elegir' : 'devolucion_pendiente';
}
