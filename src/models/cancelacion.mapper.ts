// Mapper de la respuesta de cancelar_cita (RF-09). Si la base devuelve un estado que no es de
// cancelación, se lanza un error: nunca se muestra como cancelada una cita que no lo está (RN-14).
import type { CancelacionRespuesta } from '@/types/api';
import type { EstadoMulta, ResultadoCancelacionBase } from '@/types/entidades';

const ESTADOS_MULTA: readonly EstadoMulta[] = ['pendiente', 'cobrada_anticipo', 'pagada', 'perdonada'];

const esEstadoMulta = (valor: string): valor is EstadoMulta =>
  (ESTADOS_MULTA as readonly string[]).includes(valor);

export const mapCancelacion = (r: CancelacionRespuesta): ResultadoCancelacionBase => {
  if (r.estado !== 'cancelada_a_tiempo' && r.estado !== 'cancelada_tarde') {
    throw new Error(`La base no confirmó la cancelación (estado: ${r.estado}).`);
  }
  // Una multa con estado desconocido se trata como pendiente: es el caso que pide acción.
  const multaEstado =
    r.multa_estado === null ? null : esEstadoMulta(r.multa_estado) ? r.multa_estado : 'pendiente';
  return {
    estado: r.estado,
    anticipoAprobado: Math.round(r.anticipo_aprobado),
    multaEstado,
  };
};
