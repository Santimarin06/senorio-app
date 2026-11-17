// Accesos comunes de la Cuenta del cliente y del Perfil del profesional (D-16): Política de
// reservas, Privacidad y Cerrar sesión. Llevan a las mismas pantallas que el Drawer.
import { router } from 'expo-router';
import { View } from 'react-native';

import Boton from '@/components/Boton';
import Tarjeta from '@/components/Tarjeta';
import { useCerrarSesion } from '@/hooks/useCerrarSesion';

export default function AccesosCuenta() {
  const salir = useCerrarSesion();
  return (
    <View>
      <Tarjeta
        titulo="Política de reservas y cancelación"
        icono="document-text-outline"
        onPress={() => router.navigate('/politica')}
      />
      <Tarjeta
        titulo="Privacidad y tratamiento de datos"
        icono="shield-checkmark-outline"
        onPress={() => router.navigate('/privacidad')}
      />
      <Boton variante="borde" className="mt-4" onPress={salir}>
        Cerrar sesión
      </Boton>
    </View>
  );
}
