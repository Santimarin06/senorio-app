// Contenido del Drawer (en navegation-app existía CustomDrawer pero no se conectaba).
// Muestra la marca, las entradas del Drawer y "Cerrar sesión".
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from 'expo-router/drawer';
import { Text, View } from 'react-native';

import { iconoNav } from '@/components/navegacion/iconoNav';
import { NEGOCIO } from '@/config/negocio';
import { useSesionStore } from '@/store/useSesionStore';

export default function CustomDrawer(props: DrawerContentComponentProps) {
  const usuario = useSesionStore((estado) => estado.usuario);
  const cerrarSesion = useSesionStore((estado) => estado.cerrarSesion);

  const salir = () => {
    cerrarSesion();
    router.replace('/login');
  };

  return (
    <DrawerContentScrollView {...props}>
      <View className="mb-4 items-center rounded-xl bg-primary p-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-fondo">
          <Ionicons name="cut" size={30} color="#111111" />
        </View>
        <Text className="mt-3 font-titulo text-lg text-white">{NEGOCIO.nombre}</Text>
        {usuario ? <Text className="font-texto text-sm text-secondary-100">{usuario.nombre}</Text> : null}
      </View>

      <DrawerItemList {...props} />

      <DrawerItem
        label="Cerrar sesión"
        onPress={salir}
        icon={iconoNav('log-out-outline')}
      />
    </DrawerContentScrollView>
  );
}
