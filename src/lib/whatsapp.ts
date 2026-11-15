// Mensaje de WhatsApp prellenado hacia la barbería (RF-07, RN-12). La app solo arma el
// enlace wa.me; el cliente pulsa enviar. La cita ya quedó guardada aunque no lo envíe.
import { NEGOCIO } from '@/config/negocio';
import { formatoCOP } from '@/lib/dinero';

export interface DatosAvisoReserva {
  cliente: string;
  profesional: string;
  servicios: string[];
  /** Fecha y hora ya en texto de Bogotá, por ejemplo "martes 17 de noviembre, 10:00 a. m.". */
  fechaHora: string;
  total: number;
}

export function mensajeReserva(d: DatosAvisoReserva): string {
  return [
    `Hola, ${NEGOCIO.nombre}. Acabo de reservar una cita en la app.`,
    `Cliente: ${d.cliente}`,
    `Profesional: ${d.profesional}`,
    `Servicios: ${d.servicios.join(', ')}`,
    `Fecha y hora: ${d.fechaHora}`,
    `Valor: ${formatoCOP(d.total)}`,
  ].join('\n');
}

export const enlaceWhatsApp = (mensaje: string): string =>
  `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
