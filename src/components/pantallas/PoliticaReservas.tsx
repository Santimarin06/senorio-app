// Política de multas, tolerancia y cancelación (RN-13). Los valores salen de config/negocio.ts.
import { ScrollView, Text } from 'react-native';

import { NEGOCIO } from '@/config/negocio';
import { formatoCOP } from '@/lib/dinero';

/** Puntos de la política (RN-13). Se muestran aquí y antes de confirmar una reserva (RF-06). */
export const PUNTOS_POLITICA = [
  `Tolerancia de llegada: ${NEGOCIO.toleranciaMinutos} minutos. Después, la cita queda como no asistida.`,
  `No asistir o cancelar con menos de ${NEGOCIO.horasMinimasCancelarSinMulta} horas genera una multa de ${formatoCOP(NEGOCIO.multa)}, que se descuenta del anticipo.`,
  'Si no hay anticipo, la multa pendiente bloquea nuevas reservas hasta pagarla.',
  `Anticipo opcional: abono desde ${formatoCOP(NEGOCIO.abonoMinimo)} hasta el total de la cita, o pago total. Cuenta como pagado cuando el local confirma el comprobante.`,
  `Cancelar con ${NEGOCIO.horasMinimasCancelarSinMulta} horas o más y reagendar: el anticipo pasa a la nueva cita.`,
  `Cancelar sin reagendar: se devuelve el anticipo menos ${formatoCOP(NEGOCIO.costoDevolucion)} (y menos la multa si faltan menos de ${NEGOCIO.horasMinimasCancelarSinMulta} horas).`,
  `Una cita no asistida se puede reagendar dentro de ${NEGOCIO.diasParaReagendarNoAsistida} días.`,
];

export default function PoliticaReservas() {
  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      {PUNTOS_POLITICA.map((punto) => (
        <Text key={punto} className="mb-4 font-texto text-base text-primary">
          • {punto}
        </Text>
      ))}
    </ScrollView>
  );
}
