// Layout raíz: fuentes + splash (como navegation-app) y QueryClientProvider (como 06-Peliculas).
import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { configurarManejador } from '@/services/notificaciones';
import { restaurarSesion } from '@/services/sesion';
import { useSesionStore } from '@/store/useSesionStore';

SplashScreen.preventAutoHideAsync();

// La sesión guardada se lee una sola vez al abrir la app (RF-01): así la persona sigue dentro
// después de cerrar y volver a abrir.
void restaurarSesion();

// Las notificaciones locales (RF-30) también se muestran con la app abierta.
configurarManejador();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [fuentesListas, errorFuentes] = useFonts({
    ArchivoBlack: require('../../assets/fonts/ArchivoBlack-Regular.ttf'),
    Oswald: require('../../assets/fonts/Oswald-VariableFont_wght.ttf'),
  });

  const sesionRestaurada = useSesionStore((s) => s.restaurada);
  const fuentesResueltas = fuentesListas || Boolean(errorFuentes);

  useEffect(() => {
    // Si una fuente falla se sigue con la del sistema en vez de dejar la app trabada.
    if (fuentesResueltas && sesionRestaurada) SplashScreen.hideAsync();
  }, [fuentesResueltas, sesionRestaurada]);

  // El splash sigue visible hasta saber si hay sesión: así no parpadea el inicio de sesión.
  if (!fuentesResueltas || !sesionRestaurada) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
