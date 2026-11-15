// Perfil compartido por la tab Cuenta del cliente y la tab Perfil del profesional (D-11, D-16):
// datos del usuario, Política, Privacidad y Cerrar sesión.
import { router } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import Boton from '@/components/Boton';
import Tarjeta from '@/components/Tarjeta';
import { useCerrarSesion } from '@/hooks/useCerrarSesion';
import { useSesionStore } from '@/store/useSesionStore';

export default function PerfilUsuario() {
  const usuario = useSesionStore((s) => s.usuario);
  const salir = useCerrarSesion();

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      <Text className="font-titulo text-xl text-primary">{usuario?.nombre ?? ''}</Text>
      <Text className="font-texto text-base text-secondary">{usuario?.correo ?? ''}</Text>
      <Text className="mb-6 font-texto text-base text-secondary">{usuario?.telefono ?? ''}</Text>

      <Tarjeta
        titulo="Política de reservas"
        icono="document-text-outline"
        onPress={() => router.navigate('/politica')}
      />
      <Tarjeta
        titulo="Privacidad"
        icono="shield-checkmark-outline"
        onPress={() => router.navigate('/privacidad')}
      />

      <Boton variante="borde" className="mt-4" onPress={salir}>
        Cerrar sesión
      </Boton>
    </ScrollView>
  );
}
