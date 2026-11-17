// Piezas compartidas por las pestañas de Revisión (RF-25, RF-28).
import { Text, View } from 'react-native';

import { codigoCita } from '@/lib/codigoCita';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { ETIQUETA_ESTADO } from '@/models/cita.mapper';
import type { CitaRevision } from '@/types/entidades';

/** "Cita SB-1042 · Mario · viernes 6 de noviembre, 3:00 p. m." y el estado si no está confirmada. */
export function DatosCita({ cita }: { cita: CitaRevision }) {
  return (
    <>
      <Text className="font-texto text-sm text-secondary">
        Cita {codigoCita(cita.id)} · {cita.profesional} · {formatoFechaHoraBogota(cita.inicio)}
      </Text>
      {cita.estado === 'confirmada' ? null : (
        <Text className="font-texto text-sm text-primary">Estado: {ETIQUETA_ESTADO[cita.estado]}</Text>
      )}
    </>
  );
}

/** Fila etiqueta / valor alineada a los lados. */
export function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="font-texto text-base text-secondary">{etiqueta}</Text>
      <Text className="font-texto text-base text-primary">{valor}</Text>
    </View>
  );
}
