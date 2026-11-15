// Ícono para Tabs y Drawer. En RN 0.88 el color que entrega la navegación puede ser null,
// y Ionicons solo acepta string: se convierte aquí una sola vez.
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

type NombreIcono = keyof typeof Ionicons.glyphMap;

export const iconoNav =
  (nombre: NombreIcono) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={nombre} size={size} color={typeof color === 'string' ? color : undefined} />
  );
