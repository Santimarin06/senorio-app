// Parámetros del negocio (SRS §3 y docs/decisiones.md).
// Nunca escribir estos números sueltos en las pantallas: importarlos desde aquí.
// Dinero: pesos COP como enteros.

import type { LatLng } from '@/types/ubicacion';

export const NEGOCIO = {
  nombre: 'Señorío Barber',
  /** WhatsApp de la barbería, con indicativo 57 (RN-12). */
  whatsapp: '573189773741',

  toleranciaMinutos: 10,
  horasMinimasCancelarSinMulta: 4,
  multa: 10_000,
  costoDevolucion: 2_000,
  abonoMinimo: 10_000,
  diasParaReagendarNoAsistida: 2,
  pasoFranjaMinutos: 15,

  /** Cantidades del cotizador (RN-11). */
  cantidadMinima: 1,
  cantidadMaxima: 10,
} as const;

/** Horario en hora de Bogotá, como "HH:MM". 0 = domingo … 6 = sábado. */
export const HORARIO = {
  semana: { apertura: '09:00', cierre: '19:30' }, // lunes a jueves
  viernesSabado: { apertura: '09:00', cierre: '20:30' },
  domingoFestivoHabilitado: { apertura: '10:00', cierre: '16:00' },
  almuerzo: { inicio: '12:00', fin: '13:00' },
} as const;

/** Medios de pago del anticipo (D-04). Se muestran al cliente: no son secretos. */
export const MEDIOS_PAGO = [
  { nombre: 'Nequi', dato: '3017821621' },
  { nombre: 'Bold (llave)', dato: '@bold31897737' },
  { nombre: 'Bancolombia ahorros', dato: '1700-1463-4228' },
] as const;

/** Ubicación de la barbería (D-03). */
export const UBICACION_LOCAL: LatLng = {
  latitude: 4.812879019062988,
  longitude: -75.70027155767009,
};
