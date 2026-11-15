import { Stack } from 'expo-router';

import { opcionesStack } from '@/components/navegacion/opcionesStack';

export default function ProductosStackLayout() {
  return (
    <Stack screenOptions={opcionesStack}>
      <Stack.Screen name="productos" options={{ title: 'Productos' }} />
    </Stack>
  );
}
