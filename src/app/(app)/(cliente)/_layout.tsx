// Tabs del cliente (como (tabs)/_layout.tsx en navegation-app). Cada tab tiene su propio Stack.
import { Redirect, Tabs } from 'expo-router';

import { iconoNav } from '@/components/navegacion/iconoNav';
import { opcionesTabsSinCabecera } from '@/components/navegacion/opcionesTabs';
import { puedeEntrar, rutaInicial } from '@/lib/navegacion';
import { useSesionStore } from '@/store/useSesionStore';

export default function ClienteTabsLayout() {
  const usuario = useSesionStore((s) => s.usuario);

  // Un profesional o administrador que llegue aquí vuelve a su propia sección.
  if (!puedeEntrar(usuario?.rol, 'cliente')) {
    return <Redirect href={usuario ? rutaInicial(usuario.rol) : '/login'} />;
  }

  return (
    <Tabs screenOptions={opcionesTabsSinCabecera}>
      <Tabs.Screen
        name="(inicio)"
        options={{ title: 'Inicio', tabBarIcon: iconoNav('home-outline') }}
      />
      <Tabs.Screen
        name="(citas)"
        options={{ title: 'Citas', tabBarIcon: iconoNav('calendar-outline') }}
      />
      <Tabs.Screen
        name="(productos)"
        options={{ title: 'Productos', tabBarIcon: iconoNav('bag-outline') }}
      />
      <Tabs.Screen
        name="(cuenta)"
        options={{ title: 'Cuenta', tabBarIcon: iconoNav('person-outline') }}
      />
    </Tabs>
  );
}
