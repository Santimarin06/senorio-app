// Tabs del profesional: Mi agenda, Avisos y Perfil (SRS §6 y §7, D-10, D-11).
// Aquí se monta useRecordatorios (RF-30): sincroniza recordatorios y avisos mientras el
// profesional tenga la app abierta, en cualquiera de sus tabs.
import { Redirect, Tabs } from 'expo-router';

import { iconoNav } from '@/components/navegacion/iconoNav';
import { opcionesTabsConCabecera } from '@/components/navegacion/opcionesTabs';
import { useAvisos } from '@/hooks/useAvisos';
import { useRecordatorios } from '@/hooks/useRecordatorios';
import { puedeEntrar, rutaInicial } from '@/lib/navegacion';
import { useSesionStore } from '@/store/useSesionStore';

export default function ProfesionalTabsLayout() {
  const usuario = useSesionStore((s) => s.usuario);
  const esProfesional = puedeEntrar(usuario?.rol, 'profesional');

  // Los hooks van antes del Redirect: no se pueden llamar de forma condicional.
  useRecordatorios(esProfesional ? (usuario?.profesionalId ?? null) : null);
  const { data: avisos } = useAvisos(esProfesional);
  const noLeidos = avisos?.filter((a) => !a.leida).length ?? 0;

  if (!esProfesional) {
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
        options={{
          title: 'Avisos',
          tabBarIcon: iconoNav('notifications-outline'),
          tabBarBadge: noLeidos > 0 ? noLeidos : undefined,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: iconoNav('person-outline') }}
      />
    </Tabs>
  );
}
