// Tabs del profesional: Mi agenda, Avisos y Perfil (SRS §6 y §7, D-10, D-11).
import { Redirect, Tabs } from 'expo-router';

import { iconoNav } from '@/components/navegacion/iconoNav';
import { opcionesTabsConCabecera } from '@/components/navegacion/opcionesTabs';
import { puedeEntrar, rutaInicial } from '@/lib/navegacion';
import { useSesionStore } from '@/store/useSesionStore';

export default function ProfesionalTabsLayout() {
  const usuario = useSesionStore((s) => s.usuario);

  if (!puedeEntrar(usuario?.rol, 'profesional')) {
    return <Redirect href={usuario ? rutaInicial(usuario.rol) : '/login'} />;
  }

  return (
    <Tabs screenOptions={opcionesTabsConCabecera}>
      <Tabs.Screen
        name="mi-agenda"
        options={{ title: 'Mi agenda', tabBarIcon: iconoNav('calendar-outline') }}
      />
      <Tabs.Screen
        name="avisos"
        options={{ title: 'Avisos', tabBarIcon: iconoNav('notifications-outline') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: iconoNav('person-outline') }}
      />
    </Tabs>
  );
}
