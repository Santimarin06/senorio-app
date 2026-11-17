// Stack de la tab Gestión del administrador: la lista y los formularios (RF-26, RF-27, RF-29).
import { Stack } from 'expo-router';

import { opcionesStack } from '@/components/navegacion/opcionesStack';

/** "Editar …" si la ruta trae un id; "Nuevo …" si no. */
const conId = (params: object | undefined): boolean =>
  Boolean(params && 'id' in params && params.id);

export default function GestionStackLayout() {
  return (
    <Stack screenOptions={opcionesStack}>
      <Stack.Screen name="gestion" options={{ title: 'Gestión' }} />
      <Stack.Screen
        name="servicio"
        options={({ route }) => ({
          title: conId(route.params) ? 'Editar servicio' : 'Nuevo servicio',
        })}
      />
      <Stack.Screen
        name="producto"
        options={({ route }) => ({
          title: conId(route.params) ? 'Editar producto' : 'Nuevo producto',
        })}
      />
      <Stack.Screen
        name="profesional"
        options={({ route }) => ({
          title: conId(route.params) ? 'Editar profesional' : 'Nuevo profesional',
        })}
      />
    </Stack>
  );
}
