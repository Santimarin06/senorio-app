// Drawer del cliente: envuelve las Tabs y agrega los accesos complementarios (D-16).
// Como (drawer)/_layout.tsx en navegation-app, pero con CustomDrawer conectado.
import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';

import CustomDrawer from '@/components/CustomDrawer';
import { iconoNav } from '@/components/navegacion/iconoNav';
import { useSesionStore } from '@/store/useSesionStore';

export default function ClienteDrawerLayout() {
  const usuario = useSesionStore((s) => s.usuario);

  // Sin sesión de cliente no se entra a esta sección.
  if (usuario?.rol !== 'cliente') return <Redirect href="/login" />;

  return (
    <Drawer
      drawerContent={CustomDrawer}
      screenOptions={{
        drawerActiveTintColor: '#111111',
        drawerInactiveTintColor: '#6B6B6B',
        drawerActiveBackgroundColor: '#E4E4E4',
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Oswald' },
        drawerLabelStyle: { fontFamily: 'Oswald' },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerShown: false, // el header lo pone el Stack de cada tab
          drawerLabel: 'Inicio',
          title: 'Inicio',
          drawerIcon: iconoNav('home-outline'),
        }}
      />
      <Drawer.Screen
        name="mapa"
        options={{
          drawerLabel: 'El local',
          title: 'El local',
          drawerIcon: iconoNav('map-outline'),
        }}
      />
      <Drawer.Screen
        name="politica"
        options={{
          drawerLabel: 'Política de reservas',
          title: 'Política de reservas',
          drawerIcon: iconoNav('document-text-outline'),
        }}
      />
      <Drawer.Screen
        name="privacidad"
        options={{
          drawerLabel: 'Privacidad',
          title: 'Privacidad',
          drawerIcon: iconoNav('shield-checkmark-outline'),
        }}
      />
    </Drawer>
  );
}
