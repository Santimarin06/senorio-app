// Stack de la tab Agenda del administrador: la agenda del local y los días de trabajo (RF-22 a RF-24).
import { Stack } from 'expo-router';

import { opcionesStack } from '@/components/navegacion/opcionesStack';

export default function AgendaAdministradorStackLayout() {
  return (
    <Stack screenOptions={opcionesStack}>
      <Stack.Screen name="agenda" options={{ title: 'Agenda del local' }} />
      <Stack.Screen name="dias" options={{ title: 'Días laborables' }} />
      <Stack.Screen name="horario-dia" options={{ title: 'Horario de un día' }} />
      <Stack.Screen name="bloqueos" options={{ title: 'Bloqueos' }} />
      <Stack.Screen name="bloqueo-nuevo" options={{ title: 'Nuevo bloqueo' }} />
    </Stack>
  );
}
