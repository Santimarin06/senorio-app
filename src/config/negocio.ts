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

/** Días de trabajo del panel (RF-24, D-41): cuántos días hacia adelante se listan. */
export const DIAS_TRABAJO = {
  /** Domingos y festivos que se muestran para habilitar. */
  diasDomingosFestivos: 60,
  /** Excepciones de horario (dias_habilitados) que se listan. */
  diasExcepciones: 365,
} as const;

/** Parámetros de src/lib/finanzas.ts (multas y devoluciones), tomados de NEGOCIO. */
export const FINANZAS = {
  MULTA: NEGOCIO.multa,
  COSTO_DEVOLUCION: NEGOCIO.costoDevolucion,
  ABONO_MINIMO: NEGOCIO.abonoMinimo,
  HORAS_SIN_MULTA: NEGOCIO.horasMinimasCancelarSinMulta,
  PLAZO_REAGENDAR_NO_ASISTIDA_DIAS: NEGOCIO.diasParaReagendarNoAsistida,
} as const;

/** "HH:MM" a minutos desde medianoche. */
const aMinutos = (hora: string): number => {
  const [h = '0', m = '0'] = hora.split(':');
  return Number(h) * 60 + Number(m);
};

/**
 * Parámetros de src/lib/disponibilidad.ts (disponibilidad semanal), en minutos desde
 * medianoche en hora de Bogotá. Salen de HORARIO para no repetir las horas. La base valida lo
 * mismo en validar_horario_cita: si cambian aquí, se cambian allá con una migración (D-23).
 */
export const DISPONIBILIDAD = {
  PASO_MIN: NEGOCIO.pasoFranjaMinutos,
  /** Minutos mínimos entre "ahora" y el inicio de la cita (D-24: 0, sin antelación mínima). */
  ANTICIPACION_MIN: 0,
  ALMUERZO: { inicioMin: aMinutos(HORARIO.almuerzo.inicio), finMin: aMinutos(HORARIO.almuerzo.fin) },
  HABILITADO: {
    abreMin: aMinutos(HORARIO.domingoFestivoHabilitado.apertura),
    cierraMin: aMinutos(HORARIO.domingoFestivoHabilitado.cierre),
  },
  LUN_JUE: { abreMin: aMinutos(HORARIO.semana.apertura), cierraMin: aMinutos(HORARIO.semana.cierre) },
  VIE_SAB: {
    abreMin: aMinutos(HORARIO.viernesSabado.apertura),
    cierraMin: aMinutos(HORARIO.viernesSabado.cierre),
  },
  /** America/Bogota: UTC-5 fijo, sin horario de verano. */
  OFFSET_BOGOTA_MIN: -5 * 60,
} as const;

/** Medios de pago del anticipo (D-04). Se muestran al cliente: no son secretos. */
export const MEDIOS_PAGO = [
  { id: 'nequi', nombre: 'Nequi', etiqueta: 'Número', dato: '3017821621' },
  { id: 'bold', nombre: 'Llave Bold', etiqueta: 'Llave', dato: '@bold31897737' },
  { id: 'bancolombia', nombre: 'Ahorros Bancolombia', etiqueta: 'Cuenta', dato: '1700-1463-4228' },
] as const;

/** Archivo del comprobante (RF-13): lo mismo que exige el bucket privado de Supabase. */
export const COMPROBANTE = {
  bucket: 'comprobantes',
  tamanoMaximoBytes: 5 * 1024 * 1024,
  /** Calidad con la que el selector comprime la foto (también la convierte a JPEG en iOS). */
  calidad: 0.8,
  /** Segundos que dura la URL firmada con la que el administrador ve la imagen (RF-28). */
  urlFirmadaSegundos: 10 * 60,
} as const;

/**
 * Fotos de productos (RF-27, D-43): bucket público "fotos", lo mismo que exige su migración.
 * La foto se recorta cuadrada al elegirla: así pesa menos y se ve igual en la tarjeta.
 */
export const FOTOS = {
  bucket: 'fotos',
  carpetaProductos: 'productos',
  carpetaProfesionales: 'profesionales',
  tamanoMaximoBytes: 5 * 1024 * 1024,
  calidad: 0.7,
} as const;

/** Formularios de gestión del catálogo (RF-26, RF-27, D-43): límites de los campos. */
export const GESTION = {
  nombreMaximo: 60,
  descripcionMaxima: 200,
  /** Una cita no pasa de una jornada: un servicio de más de 8 horas es un error de tecleo. */
  duracionMaximaMin: 480,
  /** Tope de cordura para el precio en pesos (evita un cero de más). */
  precioMaximo: 5_000_000,
  /** Cargo del profesional (RF-29), por ejemplo "Barbero senior". */
  cargoMaximo: 40,
} as const;

/** Gestión de profesionales (RF-29): cuántas cuentas se listan a la vez al buscar. */
export const GESTION_PROFESIONALES = {
  cuentasVisibles: 8,
} as const;

/** Revisión del administrador (RF-25): cuántas multas resueltas se muestran en el historial. */
export const REVISION = {
  historialMultas: 20,
} as const;

/** Ubicación de la barbería (D-03). */
export const UBICACION_LOCAL: LatLng = {
  latitude: 4.812879019062988,
  longitude: -75.70027155767009,
};
