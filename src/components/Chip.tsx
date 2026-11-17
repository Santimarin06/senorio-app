// Opción seleccionable en forma de píldora: filtros de categoría y selector de cita.
import { Pressable, Text } from 'react-native';

interface Props {
  etiqueta: string;
  activo: boolean;
  onPress: () => void;
}

export default function Chip({ etiqueta, activo, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: activo }}
      className={`mb-2 mr-2 rounded-full border px-4 py-2 active:opacity-80 ${
        activo ? 'border-primary bg-primary' : 'border-borde bg-fondo'
      }`}
    >
      <Text className={`font-texto text-sm ${activo ? 'text-white' : 'text-primary'}`}>
        {etiqueta}
      </Text>
    </Pressable>
  );
}
