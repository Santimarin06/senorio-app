// Política de reservas (RN-13, D-16): tolerancia, multa, cancelación, anticipo y devolución.
// Una sola pantalla, abierta desde el Drawer, la Cuenta, el Perfil del profesional y el
// resumen de la reserva. Los valores salen de config/negocio.ts, nunca números sueltos.
import SeccionesTexto, { type SeccionTexto } from '@/components/SeccionesTexto';
import { MEDIOS_PAGO, NEGOCIO } from '@/config/negocio';
import { formatoCOP } from '@/lib/dinero';

const H = NEGOCIO.horasMinimasCancelarSinMulta;
const MULTA = formatoCOP(NEGOCIO.multa);
const COSTO = formatoCOP(NEGOCIO.costoDevolucion);
const ABONO = formatoCOP(NEGOCIO.abonoMinimo);
const DIAS = NEGOCIO.diasParaReagendarNoAsistida;

/** Resumen que se acepta antes de confirmar una reserva (RF-06, RN-13). */
export const PUNTOS_POLITICA = [
  `Tolerancia de llegada: ${NEGOCIO.toleranciaMinutos} minutos. Después, la cita queda como no asistida.`,
  `No asistir o cancelar con menos de ${H} horas genera una multa de ${MULTA}, que se descuenta del anticipo.`,
  'Si no hay anticipo, la multa pendiente bloquea nuevas reservas hasta pagarla.',
  `Anticipo opcional: abono desde ${ABONO} hasta el total de la cita, o pago total. Cuenta como pagado cuando el local confirma el comprobante.`,
  `Cancelar con ${H} horas o más y reagendar: el anticipo pasa a la nueva cita.`,
  `Cancelar sin reagendar: se devuelve el anticipo menos ${COSTO} (y menos la multa si faltan menos de ${H} horas).`,
  `Una cita no asistida se puede reagendar dentro de ${DIAS} días.`,
];

/** Política completa (SRS §3: RN-05 a RN-09, RN-15, RN-16; D-05, D-26, D-27, D-28). */
export const SECCIONES_POLITICA: SeccionTexto[] = [
  {
    titulo: 'Tolerancia y asistencia',
    puntos: [
      `Tienes ${NEGOCIO.toleranciaMinutos} minutos de tolerancia desde la hora de tu cita.`,
      'Pasada la tolerancia sin llegar, el profesional o el local marca la cita como no asistida.',
    ],
  },
  {
    titulo: 'Multa',
    puntos: [
      `No asistir o cancelar con menos de ${H} horas de anticipación genera una multa de ${MULTA}.`,
      `La multa se descuenta del anticipo. Como el anticipo es de ${ABONO} o más, siempre la cubre.`,
      'Sin anticipo, la multa queda pendiente: hasta pagarla o que el local la perdone no puedes reservar ni enviar anticipos de citas nuevas. La ves en tu Cuenta, con el contacto del local para resolverla.',
    ],
  },
  {
    titulo: 'Cancelación',
    puntos: [
      `Puedes cancelar desde la app. Con ${H} horas o más de anticipación no hay multa.`,
      `Si cancelas con ${H} horas o más y reagendas, todo tu anticipo pasa a la nueva cita.`,
      `Con menos de ${H} horas se cobra la multa de ${MULTA}.`,
    ],
  },
  {
    titulo: 'Anticipo',
    puntos: [
      `Es opcional: puedes reservar sin anticipo, abonar desde ${ABONO} hasta el valor de la cita o pagar el total.`,
      `Se paga por ${MEDIOS_PAGO.map((m) => m.nombre).join(', ')} y subes el comprobante en la app (JPG o PNG).`,
      'Cuenta como pagado solo cuando el local revisa el comprobante y lo confirma.',
      'Los productos no se pagan en la app: la cotización se envía por WhatsApp.',
    ],
  },
  {
    titulo: 'Devolución',
    puntos: [
      `Si cancelas con ${H} horas o más y no reagendas, te devolvemos el anticipo menos ${COSTO}, el mismo día.`,
      `Si cancelas con menos de ${H} horas y no reagendas, te devolvemos el anticipo menos la multa y menos ${COSTO}.`,
      'La devolución nunca es negativa: si el anticipo no alcanza, es de $0.',
    ],
  },
  {
    titulo: 'Si no asististe',
    puntos: [
      'Con anticipo, del anticipo se descuenta la multa y el resto (el sobrante) lo decides tú.',
      `Opción 1: devolución del sobrante menos ${COSTO}.`,
      `Opción 2: reagendar dentro de ${DIAS} días desde la fecha de la cita, con el sobrante en la nueva cita. Si el sobrante es menor a ${ABONO}, completas la diferencia hasta ${ABONO}.`,
      `Si no eliges en ${DIAS} días, queda como devolución pendiente.`,
      'Sin anticipo y con la multa pendiente no puedes reagendar esa cita hasta resolver la multa.',
    ],
  },
];

export default function PoliticaReservas() {
  return (
    <SeccionesTexto
      titulo="Política de reservas y cancelación"
      introduccion={`Cuidamos el tiempo de todos. Esto aplica a cada cita de ${NEGOCIO.nombre}; las horas son de Bogotá.`}
      secciones={SECCIONES_POLITICA}
    />
  );
}
