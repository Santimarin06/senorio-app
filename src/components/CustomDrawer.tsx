// Contenido del Drawer (en navegation-app existía CustomDrawer pero no se conectaba).
// Muestra la marca, solo las entradas del rol que inició sesión (D-16) y "Cerrar sesión".
// No usa DrawerItemList: esa lista mostraría las secciones de todos los roles.
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
} from 'expo-router/drawer';
import { Text, View } from 'react-native';

import { iconoNav } from '@/components/navegacion/iconoNav';
import { NEGOCIO } from '@/config/negocio';
import { useCerrarSesion } from '@/hooks/useCerrarSesion';
import { entradaActiva, entradasDrawer } from '@/lib/navegacion';
import { useSesionStore } from '@/store/useSesionStore';

const colores = {
  activo: '#111111',
  inactivo: '#6B6B6B',
  fondoActivo: '#E4E4E4',
};

export default function CustomDrawer(props: DrawerContentComponentProps) {
  const usuario = useSesionStore((estado) => estado.usuario);
  const salir = useCerrarSesion();
  const pathname = usePathname();

  const entradas = usuario ? entradasDrawer(usuario.rol) : [];
  const activa = entradaActiva(entradas, pathname);

  return (
    <DrawerContentScrollView {...props}>
      <View className="mb-4 items-center rounded-xl bg-primary p-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-fondo">
          <Ionicons name="cut" size={30} color="#111111" />
        </View>
        <Text className="mt-3 font-titulo text-lg text-white">{NEGOCIO.nombre}</Text>
        {usuario ? <Text className="font-texto text-sm text-secondary-100">{usuario.nombre}</Text> : null}
      </View>

      {entradas.map((entrada) => (
        <DrawerItem
          key={entrada.clave}
          label={entrada.etiqueta}
          icon={iconoNav(entrada.icono)}
          focused={entrada.clave === activa}
          activeTintColor={colores.activo}
          inactiveTintColor={colores.inactivo}
          activeBackgroundColor={colores.fondoActivo}
          labelStyle={{ fontFamily: 'Oswald' }}
          onPress={() => {
            props.navigation.closeDrawer();
            router.navigate(entrada.ruta);
          }}
        />
      ))}

      <DrawerItem
        label="Cerrar sesión"
        onPress={salir}
        icon={iconoNav('log-out-outline')}
        inactiveTintColor={colores.inactivo}
        labelStyle={{ fontFamily: 'Oswald' }}
      />
    </DrawerContentScrollView>
  );
}
