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

export interface DatosAvisoCancelacion extends DatosAvisoReserva {
  /** Código visible de la cita (D-35), por ejemplo "SB-1A2B3C". */
  codigo: string;
  /** true si la base la dejó como 'cancelada_tarde'. */
  tardia: boolean;
  /** Dinero que se le devuelve al cliente (RN-15). */
  devolucion: number;
  /** Multa que el anticipo no cubrió (RN-07). */
  multaPendiente: number;
}

/** RF-07 y RF-09: aviso de una cancelación que la base ya registró. */
export function mensajeCancelacion(d: DatosAvisoCancelacion): string {
  return [
    `Hola, ${NEGOCIO.nombre}. Cancelé mi cita ${d.codigo} en la app.`,
    `Cliente: ${d.cliente}`,
    `Profesional: ${d.profesional}`,
    `Servicios: ${d.servicios.join(', ')}`,
    `Fecha y hora: ${d.fechaHora}`,
    `Valor: ${formatoCOP(d.total)}`,
    d.tardia
      ? `Cancelé con menos de ${NEGOCIO.horasMinimasCancelarSinMulta} horas (multa de ${formatoCOP(NEGOCIO.multa)}).`
      : `Cancelé con ${NEGOCIO.horasMinimasCancelarSinMulta} horas o más de anticipación.`,
    ...(d.devolucion > 0 ? [`Devolución del anticipo: ${formatoCOP(d.devolucion)}.`] : []),
    ...(d.multaPendiente > 0 ? [`Multa pendiente: ${formatoCOP(d.multaPendiente)}.`] : []),
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

export interface DatosAvisoComprobante {
  codigoCita: string;
  codigoComprobante: string;
  tipo: 'abono' | 'total';
  monto: number;
  /** Nombre del medio de pago, por ejemplo "Nequi"; null si no se registró. */
  medio: string | null;
}

/**
 * RF-13: aviso del comprobante ya guardado en la app. WhatsApp no recibe la imagen desde el
 * enlace: el cliente la adjunta en el chat.
 */
export function mensajeComprobante(d: DatosAvisoComprobante): string {
  return [
    `Hola, ${NEGOCIO.nombre}. Subí en la app el comprobante ${d.codigoComprobante} de mi cita ${d.codigoCita}.`,
    `${d.tipo === 'total' ? 'Pago total' : 'Abono'}: ${formatoCOP(d.monto)}`,
    ...(d.medio ? [`Medio: ${d.medio}`] : []),
    'Adjunto la imagen del comprobante en este chat.',
  ].join('\n');
}

export interface DatosAvisoMulta {
  /** Código visible de la cita (D-35). */
  codigo: string;
  /** Fecha y hora de la cita en texto de Bogotá. */
  fechaHora: string;
  /** Motivo en palabras, por ejemplo "No asistió". */
  motivo: string;
  monto: number;
}

/**
 * RF-15, RN-07: el cliente pide resolver una multa pendiente. La app no cobra: el local
 * recibe el pago por fuera y el administrador la marca como pagada o la perdona (RF-25).
 */
export function mensajeMulta(d: DatosAvisoMulta): string {
  return [
    `Hola, ${NEGOCIO.nombre}. Tengo una multa pendiente y quiero resolverla para volver a reservar.`,
    `Cita: ${d.codigo} del ${d.fechaHora}`,
    `Motivo: ${d.motivo}`,
    `Multa: ${formatoCOP(d.monto)}`,
  ].join('\n');
}

export const enlaceWhatsApp = (mensaje: string): string =>
  `https://wa.me/${NEGOCIO.whatsapp}?text=${encodeURIComponent(mensaje)}`;
