// Estilo común de las Tabs de los tres roles.
import { BotonCabecera } from '@/components/navegacion/opcionesStack';

const base = {
  tabBarActiveTintColor: '#111111',
  tabBarInactiveTintColor: '#9A9A9A',
  tabBarLabelStyle: { fontFamily: 'Oswald' },
};

/** Tabs del cliente: cada tab tiene su propio Stack, que pone la cabecera. */
export const opcionesTabsSinCabecera = { ...base, headerShown: false };

/** Tabs del panel: pantallas sueltas, la cabecera la pone la Tab con el botón del menú. */
export const opcionesTabsConCabecera = {
  ...base,
  headerShown: true,
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: 'Oswald' },
  headerLeft: () => <BotonCabecera puedeVolver={false} className="ml-4" />,
};
