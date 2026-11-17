// Fechas en hora de Bogotá (UTC-5 fijo, sin horario de verano) sin depender de la zona del
// teléfono: se resta el desfase al instante UTC y se leen los campos con getUTC*.
const DESFASE_BOGOTA_MS = 5 * 60 * 60 * 1000;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Minutos desde medianoche a "9:15 a. m.", "12:00 m." o "1:00 p. m.". */
export const formatoHora = (minutosDelDia: number): string => {
  const horas24 = Math.floor(minutosDelDia / 60) % 24;
  const minutos = String(minutosDelDia % 60).padStart(2, '0');
  const horas12 = horas24 % 12 === 0 ? 12 : horas24 % 12;
  if (horas24 === 12 && minutos === '00') return '12:00 m.';
  return `${horas12}:${minutos} ${horas24 < 12 ? 'a. m.' : 'p. m.'}`;
};

/** "lunes 16 de noviembre, 3:30 p. m." para un instante ISO. Texto vacío si la fecha no es válida. */
export const formatoFechaHoraBogota = (iso: string): string => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';

  const local = new Date(ms - DESFASE_BOGOTA_MS);
  const minutosDelDia = local.getUTCHours() * 60 + local.getUTCMinutes();
  return `${DIAS[local.getUTCDay()]} ${local.getUTCDate()} de ${MESES[local.getUTCMonth()]}, ${formatoHora(minutosDelDia)}`;
};

/** Para una fecha 'YYYY-MM-DD': día abreviado, número y fecha larga ("martes 17 de noviembre"). */
export const etiquetaDia = (fecha: string): { corto: string; numero: number; largo: string } => {
  const [a = NaN, m = NaN, d = NaN] = fecha.split('-').map(Number);
  const utc = new Date(Date.UTC(a, m - 1, d));
  const dia = DIAS[utc.getUTCDay()] ?? '';
  return {
    corto: dia.slice(0, 3),
    numero: utc.getUTCDate(),
    largo: `${dia} ${utc.getUTCDate()} de ${MESES[utc.getUTCMonth()] ?? ''}`,
  };
};

/** Primera letra en mayúscula: "martes 17 de noviembre" → "Martes 17 de noviembre". */
export const mayuscula = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1);

/** Día de la semana y número: "domingo 22". */
export const diaYNumero = (fecha: string): string => {
  const { largo, numero } = etiquetaDia(fecha);
  return `${largo.split(' ')[0] ?? ''} ${numero}`;
};
