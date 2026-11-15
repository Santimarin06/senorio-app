import { Link, router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Boton from '@/components/Boton';
import { NEGOCIO } from '@/config/negocio';
import { useSesionStore } from '@/store/useSesionStore';

// RF-01 todavía no está construido: esta pantalla entra en modo demostración
// y lo dice en pantalla (no se presenta como un inicio de sesión real).
export default function LoginScreen() {
  const iniciarSesion = useSesionStore((s) => s.iniciarSesion);

  const entrarDemo = () => {
    iniciarSesion({ id: 'demo-cliente', nombre: 'Cliente de prueba', rol: 'cliente' });
    router.replace('/inicio');
  };

  return (
    <SafeAreaView className="flex-1 bg-fondo">
      <View className="flex-1 justify-center p-6">
        <Text className="font-titulo text-3xl text-primary">{NEGOCIO.nombre}</Text>
        <Text className="mb-8 font-texto text-lg text-secondary">El cuidado tiene su lugar</Text>

        <View className="mb-6 rounded-lg border border-borde p-4">
          <Text className="font-texto text-sm text-secondary">
            Modo demostración: el inicio de sesión con correo y contraseña (RF-01) aún no está
            disponible.
          </Text>
        </View>

        <Boton onPress={entrarDemo}>Entrar como cliente (demo)</Boton>

        <Link href="/registro" asChild>
          <Boton variante="texto" className="mt-2">
            Crear cuenta
          </Boton>
        </Link>
      </View>
    </SafeAreaView>
  );
}
