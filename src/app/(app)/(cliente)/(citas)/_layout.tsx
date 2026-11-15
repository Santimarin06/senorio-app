// Stack de la tab Citas: lista, detalle por id y sus flujos (SRS §7).
import { Stack } from 'expo-router';

import { opcionesStack } from '@/components/navegacion/opcionesStack';

export default function CitasStackLayout() {
  return (
    <Stack screenOptions={opcionesStack}>
      <Stack.Screen name="citas" options={{ title: 'Mis citas' }} />
      <Stack.Screen name="cita/[id]/index" options={{ title: 'Tu próxima visita' }} />
      <Stack.Screen name="cita/[id]/cancelar" options={{ title: 'Antes de cancelar' }} />
      <Stack.Screen name="cita/[id]/reagendar" options={{ title: 'Cambiamos el momento' }} />
      <Stack.Screen name="cita/[id]/anticipo" options={{ title: 'Anticipo' }} />
      <Stack.Screen name="cita/[id]/comprobante" options={{ title: 'Comprobante' }} />
    </Stack>
  );
}
