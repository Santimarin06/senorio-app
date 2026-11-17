// Stack de la tab Productos: catálogo y cotización (SRS §7). El acceso a la cotización es el
// indicador "Bolsa · n" de la pantalla de productos.
import { Stack } from 'expo-router';

import { opcionesStack } from '@/components/navegacion/opcionesStack';

export default function ProductosStackLayout() {
  return (
    <Stack screenOptions={opcionesStack}>
      <Stack.Screen name="productos" options={{ title: 'Productos' }} />
      <Stack.Screen name="cotizacion" options={{ title: 'Tu selección para llevar' }} />
    </Stack>
  );
}
