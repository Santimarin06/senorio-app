// Mensaje de WhatsApp prellenado hacia la barbería (RF-07, RN-12). La app solo arma el
// enlace wa.me; el cliente pulsa enviar. La cita ya quedó guardada aunque no lo envíe.
import { NEGOCIO } from '@/config/negocio';
import { limitarCantidad } from '@/lib/cantidad';
import { subtotalLinea, totalCotizacion } from '@/lib/cotizacion';
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

export interface DatosCotizacion {
  productos: { nombre: string; precio: number; cantidad: number }[];
  /** Cita asociada (opcional): código SB-xxxxxx, fecha y hora en texto de Bogotá y profesional. */
  cita?: { codigo: string; fechaHora: string; profesional: string } | null;
}

/** RF-10, RN-11: cotización con precios fijos. Se aclara que no es una compra. */
export function mensajeCotizacion(d: DatosCotizacion): string {
  const lineas = d.productos.map((p) => {
    const cantidad = limitarCantidad(p.cantidad);
    return `- ${p.nombre} x${cantidad}: ${formatoCOP(subtotalLinea({ precio: p.precio, cantidad }))}`;
  });
  const { total } = totalCotizacion(d.productos);

  return [
    `Hola, ${NEGOCIO.nombre}. Quiero cotizar estos productos:`,
    ...lineas,
    `Total: ${formatoCOP(total)}`,
    ...(d.cita
      ? [
          `Para recogerlos en mi cita ${d.cita.codigo} del ${d.cita.fechaHora} con ${d.cita.profesional}.`,
        ]
      : []),
    '¿Me confirman la disponibilidad? Es una cotización, no una compra.',
  ].join('\n');
}

export const enlaceWhatsApp = (mensaje: string): string =>
  `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
