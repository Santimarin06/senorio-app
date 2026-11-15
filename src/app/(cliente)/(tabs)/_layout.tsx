// Tabs del cliente (como (tabs)/_layout.tsx en navegation-app). Cada tab tiene su propio Stack.
import { Tabs } from 'expo-router';

import { iconoNav } from '@/components/navegacion/iconoNav';

export default function ClienteTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111111',
        tabBarInactiveTintColor: '#9A9A9A',
        tabBarLabelStyle: { fontFamily: 'Oswald' },
      }}
    >
      <Tabs.Screen
        name="(inicio)"
        options={{
          title: 'Inicio',
          tabBarIcon: iconoNav('home-outline'),
        }}
      />
      <Tabs.Screen
        name="(citas)"
        options={{
          title: 'Citas',
          tabBarIcon: iconoNav('calendar-outline'),
        }}
      />
      <Tabs.Screen
        name="(productos)"
        options={{
          title: 'Productos',
          tabBarIcon: iconoNav('bag-outline'),
        }}
      />
      <Tabs.Screen
        name="(cuenta)"
        options={{
          title: 'Cuenta',
          tabBarIcon: iconoNav('person-outline'),
        }}
      />
    </Tabs>
  );
}
