// Piezas compartidas por las agendas del panel (RF-21, RF-22) y los días de trabajo (RF-24):
// la banda del almuerzo y las flechas para moverse entre fechas.
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { DISPONIBILIDAD } from '@/config/negocio';
import { formatoHora } from '@/lib/fechas';

/** Almuerzo de 12:00 a 13:00: nunca hay citas (RN-01). */
export function BandaAlmuerzo() {
  const { inicioMin, finMin } = DISPONIBILIDAD.ALMUERZO;
  return (
    <View className="mb-3 rounded-xl bg-borde px-4 py-3">
      <Text className="text-center font-texto text-base text-secondary">
        {formatoHora(inicioMin)} – {formatoHora(finMin)} · Almuerzo · Sin citas
      </Text>
    </View>
  );
}

export function BotonFlecha({
  icono,
  etiqueta,
  onPress,
  disabled = false,
}: {
  icono: 'chevron-back' | 'chevron-forward';
  etiqueta: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled }}
      hitSlop={8}
      className={`h-12 w-12 items-center justify-center active:opacity-60 ${disabled ? 'opacity-30' : ''}`}
    >
      <Ionicons name={icono} size={24} color="#111111" />
    </Pressable>
  );
}

/** Fecha con flechas para ir al día anterior y al siguiente. */
export function NavegadorFecha({
  titulo,
  onAnterior,
  onSiguiente,
  anteriorDeshabilitado = false,
}: {
  titulo: string;
  onAnterior: () => void;
  onSiguiente: () => void;
  anteriorDeshabilitado?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <BotonFlecha
        icono="chevron-back"
        etiqueta="Día anterior"
        onPress={onAnterior}
        disabled={anteriorDeshabilitado}
      />
      <Text className="flex-1 text-center font-texto text-base text-primary">{titulo}</Text>
      <BotonFlecha icono="chevron-forward" etiqueta="Día siguiente" onPress={onSiguiente} />
    </View>
  );
}
