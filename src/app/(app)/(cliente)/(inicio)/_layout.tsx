// Stack de la tab Inicio: aquí vive el flujo de reserva (como (stack)/_layout.tsx en navegation-app).
import { Stack } from 'expo-router';

import { opcionesStack } from '@/components/navegacion/opcionesStack';

export default function InicioStackLayout() {
  return (
    <Stack screenOptions={opcionesStack}>
      <Stack.Screen name="inicio" options={{ title: 'Inicio' }} />
      <Stack.Screen name="reservar/index" options={{ title: 'Elige tu profesional' }} />
      <Stack.Screen name="reservar/[profesionalId]" options={{ title: 'Servicios' }} />
      <Stack.Screen name="reservar/horario" options={{ title: 'Un espacio para ti' }} />
      <Stack.Screen name="reservar/resumen" options={{ title: 'Todo en su lugar' }} />
      <Stack.Screen name="reservar/confirmacion" options={{ title: 'Cita registrada' }} />
    </Stack>
  );
}
