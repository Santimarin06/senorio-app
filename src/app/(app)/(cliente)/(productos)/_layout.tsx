// Stack de la tab Productos: catálogo y cotización (SRS §7).
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { opcionesStack } from '@/components/navegacion/opcionesStack';

function BotonCotizacion() {
  return (
    <Pressable
      onPress={() => router.push('/cotizacion')}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Ver cotización"
    >
      <Ionicons name="receipt-outline" size={24} color="#111111" />
    </Pressable>
  );
}

export default function ProductosStackLayout() {
  return (
    <Stack screenOptions={opcionesStack}>
      <Stack.Screen
        name="productos"
        options={{ title: 'Productos', headerRight: () => <BotonCotizacion /> }}
      />
      <Stack.Screen name="cotizacion" options={{ title: 'Tu selección para llevar' }} />
    </Stack>
  );
}
