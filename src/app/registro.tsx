import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';

export default function RegistroScreen() {
  return (
    <SafeAreaView className="flex-1 bg-fondo">
      <EstadoPantalla
        tipo="vacio"
        icono="construct-outline"
        mensaje="El registro de clientes (RF-01) está en construcción."
      />
      <View className="p-6">
        <Boton variante="borde" onPress={() => router.back()}>
          Volver
        </Boton>
      </View>
    </SafeAreaView>
  );
}
