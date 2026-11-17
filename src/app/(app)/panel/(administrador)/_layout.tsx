// Tabs del administrador: Agenda (con su Stack de días de trabajo), Gestión y Revisión (SRS §6 y §7).
import { Redirect, Tabs } from 'expo-router';

import { iconoNav } from '@/components/navegacion/iconoNav';
import { opcionesTabsConCabecera } from '@/components/navegacion/opcionesTabs';
import { puedeEntrar, rutaInicial } from '@/lib/navegacion';
import { useSesionStore } from '@/store/useSesionStore';

export default function AdministradorTabsLayout() {
  const usuario = useSesionStore((s) => s.usuario);

  if (!puedeEntrar(usuario?.rol, 'administrador')) {
    return <Redirect href={usuario ? rutaInicial(usuario.rol) : '/login'} />;
  }

  return (
    <Tabs screenOptions={opcionesTabsConCabecera}>
      <Tabs.Screen
        name="(agenda)"
        // La tab Agenda tiene su propio Stack, que pone la cabecera.
        options={{ title: 'Agenda', headerShown: false, tabBarIcon: iconoNav('calendar-outline') }}
      />
      <Tabs.Screen
        name="gestion"
        options={{ title: 'Gestión', tabBarIcon: iconoNav('construct-outline') }}
      />
      <Tabs.Screen
        name="revision"
        options={{ title: 'Revisión', tabBarIcon: iconoNav('checkmark-done-outline') }}
      />
    </Tabs>
  );
}
