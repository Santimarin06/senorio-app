import { router } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import Boton from '@/components/Boton';
import Tarjeta from '@/components/Tarjeta';
import { useSesionStore } from '@/store/useSesionStore';

export default function CuentaScreen() {
  const usuario = useSesionStore((s) => s.usuario);
  const cerrarSesion = useSesionStore((s) => s.cerrarSesion);

  const salir = () => {
    cerrarSesion();
    router.replace('/login');
  };

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      <Text className="mb-6 font-titulo text-xl text-primary">{usuario?.nombre ?? 'Cliente'}</Text>

      <Tarjeta
        titulo="Política de reservas"
        icono="document-text-outline"
        onPress={() => router.push('/politica')}
      />
      <Tarjeta
        titulo="Privacidad"
        icono="shield-checkmark-outline"
        onPress={() => router.push('/privacidad')}
      />

      <Boton variante="borde" className="mt-4" onPress={salir}>
        Cerrar sesión
      </Boton>
    </ScrollView>
  );
}
