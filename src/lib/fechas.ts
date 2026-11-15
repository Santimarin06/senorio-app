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

/** "lunes 16 de noviembre, 3:30 p. m." para un instante ISO. Texto vacío si la fecha no es válida. */
export const formatoFechaHoraBogota = (iso: string): string => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';

  const local = new Date(ms - DESFASE_BOGOTA_MS);
  const horas24 = local.getUTCHours();
  const minutos = String(local.getUTCMinutes()).padStart(2, '0');
  const horas12 = horas24 % 12 === 0 ? 12 : horas24 % 12;
  const sufijo = horas24 < 12 ? 'a. m.' : 'p. m.';

  return `${DIAS[local.getUTCDay()]} ${local.getUTCDate()} de ${MESES[local.getUTCMonth()]}, ${horas12}:${minutos} ${sufijo}`;
};
