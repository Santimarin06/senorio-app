import { Link, Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Boton from '@/components/Boton';
import { ETIQUETA_ROL, USUARIOS_DEMO } from '@/config/demo';
import { NEGOCIO } from '@/config/negocio';
import { rutaInicial } from '@/lib/navegacion';
import { useSesionStore } from '@/store/useSesionStore';
import type { Rol } from '@/types/sesion';

const ROLES: Rol[] = ['cliente', 'profesional', 'administrador'];

// RF-01 todavía no está construido: esta pantalla entra en modo demostración con el rol
// elegido y lo dice en pantalla (D-19, D-20). No se presenta como un inicio de sesión real.
export default function LoginScreen() {
  const usuario = useSesionStore((s) => s.usuario);
  const iniciarSesion = useSesionStore((s) => s.iniciarSesion);

  // Con sesión abierta no tiene sentido volver a esta pantalla.
  if (usuario) return <Redirect href={rutaInicial(usuario.rol)} />;

  const entrarDemo = (rol: Rol) => {
    iniciarSesion(USUARIOS_DEMO[rol]);
    router.replace(rutaInicial(rol));
  };

  return (
    <SafeAreaView className="flex-1 bg-fondo">
      <View className="flex-1 justify-center p-6">
        <Text className="font-titulo text-3xl text-primary">{NEGOCIO.nombre}</Text>
        <Text className="mb-8 font-texto text-lg text-secondary">El cuidado tiene su lugar</Text>

        <View className="mb-6 rounded-lg border border-borde p-4">
          <Text className="font-texto text-sm text-secondary">
            Modo demostración: el inicio de sesión con correo y contraseña (RF-01) aún no está
            disponible. Elige un rol para recorrer la app.
          </Text>
        </View>

        {ROLES.map((rol) => (
          <Boton
            key={rol}
            variante={rol === 'cliente' ? 'relleno' : 'borde'}
            className="mb-3"
            onPress={() => entrarDemo(rol)}
          >
            {`Entrar como ${ETIQUETA_ROL[rol]} (demo)`}
          </Boton>
        ))}

        <Link href="/registro" asChild>
          <Boton variante="texto">Crear cuenta</Boton>
        </Link>
      </View>
    </SafeAreaView>
  );
}
