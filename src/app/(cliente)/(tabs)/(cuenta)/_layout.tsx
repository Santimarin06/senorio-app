import { Stack } from 'expo-router';

import { opcionesStack } from '@/components/navegacion/opcionesStack';

export default function CuentaStackLayout() {
  return (
    <Stack screenOptions={opcionesStack}>
      <Stack.Screen name="cuenta" options={{ title: 'Cuenta' }} />
    </Stack>
  );
}
