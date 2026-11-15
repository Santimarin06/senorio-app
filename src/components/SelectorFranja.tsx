// Selector de franja reutilizable (SRS §6): lo usan el horario de la reserva y, después,
// el reagendamiento (RF-14). Solo las franjas libres se pueden elegir; las demás se ven
// deshabilitadas con su motivo (RF-04). El almuerzo se dibuja aparte como "No disponible".
import { Pressable, Text, View } from 'react-native';

import { CONFIG, partirPorAlmuerzo, type EstadoFranja, type Franja } from '@/lib/disponibilidad';
import { formatoHora } from '@/lib/fechas';

interface Props {
  franjas: Franja[];
  /** Minuto de inicio de la franja elegida, o null. */
  seleccionada: number | null;
  onElegir: (franja: Franja) => void;
}

const MOTIVO: Record<EstadoFranja, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  pasada: 'Ya pasó',
  bloqueada: 'No disponible',
};

function BotonFranja({
  franja,
  elegida,
  onElegir,
}: {
  franja: Franja;
  elegida: boolean;
  onElegir: (franja: Franja) => void;
}) {
  const libre = franja.estado === 'libre';
  const texto = `${formatoHora(franja.inicioMin)} a ${formatoHora(franja.finMin)}`;

  return (
    <Pressable
      onPress={() => onElegir(franja)}
      disabled={!libre}
      accessibilityRole="radio"
      accessibilityState={{ selected: elegida, disabled: !libre }}
      accessibilityLabel={libre ? texto : `${texto}, ${MOTIVO[franja.estado]}`}
      className={`mb-2 flex-row items-center justify-between rounded-lg border px-4 py-3 ${
        elegida ? 'border-primary bg-primary' : libre ? 'border-borde bg-fondo' : 'border-borde bg-borde'
      }`}
    >
      <Text
        className={`font-texto text-base ${
          elegida ? 'text-white' : libre ? 'text-primary' : 'text-secondary-100 line-through'
        }`}
      >
        {texto}
      </Text>
      {!libre ? (
        <Text className="font-texto text-sm text-secondary">{MOTIVO[franja.estado]}</Text>
      ) : null}
    </Pressable>
  );
}

export default function SelectorFranja({ franjas, seleccionada, onElegir }: Props) {
  const { antes, despues } = partirPorAlmuerzo(franjas);
  const hayAlmuerzo = antes.length > 0 && despues.length > 0;

  const pintar = (lista: Franja[]) =>
    lista.map((f) => (
      <BotonFranja
        key={f.inicioMin}
        franja={f}
        elegida={f.inicioMin === seleccionada}
        onElegir={onElegir}
      />
    ));

  return (
    <View accessibilityRole="radiogroup">
      {pintar(antes)}
      {hayAlmuerzo ? (
        <View className="mb-2 rounded-lg border border-dashed border-secondary-100 px-4 py-3">
          <Text className="font-texto text-base text-secondary">
            {`${formatoHora(CONFIG.ALMUERZO.inicioMin)} a ${formatoHora(CONFIG.ALMUERZO.finMin)} · Almuerzo, no disponible`}
          </Text>
        </View>
      ) : null}
      {pintar(despues)}
    </View>
  );
}
