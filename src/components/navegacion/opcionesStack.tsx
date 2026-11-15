// Cabecera común de los Stack de cada tab (como el headerLeft del Stack en navegation-app):
// si se puede volver, flecha atrás; si no, botón que abre el Drawer.
// Diferencia con clase: usa DrawerActions en vez de useNavigation('/(drawer)') as any.
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import { Pressable } from 'react-native';

interface Props {
  puedeVolver: boolean;
  /** Margen del botón: el header del Stack ya trae espacio a la izquierda; el de Tabs no. */
  className?: string;
}

export function BotonCabecera({ puedeVolver, className = 'mr-4' }: Props) {
  const navigation = useNavigation();

  const alPulsar = () => {
    if (puedeVolver) {
      router.back();
      return;
    }
    // La acción sube por los navegadores hasta el Drawer que envuelve las Tabs.
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  return (
    <Pressable
      onPress={alPulsar}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={puedeVolver ? 'Volver' : 'Abrir menú'}
      className={className}
    >
      <Ionicons name={puedeVolver ? 'arrow-back' : 'menu'} size={24} color="#111111" />
    </Pressable>
  );
}

export const opcionesStack = {
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: 'Oswald' },
  contentStyle: { backgroundColor: '#FFFFFF' },
  headerLeft: ({ canGoBack }: { canGoBack?: boolean }) => (
    <BotonCabecera puedeVolver={Boolean(canGoBack)} />
  ),
};
