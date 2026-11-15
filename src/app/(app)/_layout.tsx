// Drawer de la app: envuelve las Tabs de cada rol (Drawer › Tabs › Stack, D-16).
// Es uno solo para los tres roles; CustomDrawer muestra únicamente las entradas del rol.
import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';

import CustomDrawer from '@/components/CustomDrawer';
import { useSesionStore } from '@/store/useSesionStore';

export default function AppDrawerLayout() {
  const usuario = useSesionStore((s) => s.usuario);

  // Sin sesión no se entra a ninguna sección.
  if (!usuario) return <Redirect href="/login" />;

  return (
    <Drawer
      drawerContent={CustomDrawer}
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Oswald' },
        headerTintColor: '#111111',
      }}
    >
      {/* Secciones por rol: la cabecera la ponen sus Tabs o Stacks. */}
      <Drawer.Screen name="(cliente)" options={{ headerShown: false, title: 'Inicio' }} />
      <Drawer.Screen
        name="panel/(profesional)"
        options={{ headerShown: false, title: 'Mi agenda' }}
      />
      <Drawer.Screen
        name="panel/(administrador)"
        options={{ headerShown: false, title: 'Agenda del local' }}
      />

      {/* Accesos complementarios, comunes a los tres roles. */}
      <Drawer.Screen name="mapa" options={{ title: 'El local' }} />
      <Drawer.Screen name="politica" options={{ title: 'Política de reservas' }} />
      <Drawer.Screen name="privacidad" options={{ title: 'Privacidad' }} />
    </Drawer>
  );
}
