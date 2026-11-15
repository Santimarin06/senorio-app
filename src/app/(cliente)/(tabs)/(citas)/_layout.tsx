import { Stack } from 'expo-router';

import { opcionesStack } from '@/components/navegacion/opcionesStack';

export default function CitasStackLayout() {
  return (
    <Stack screenOptions={opcionesStack}>
      <Stack.Screen name="citas" options={{ title: 'Mis citas' }} />
    </Stack>
  );
}
