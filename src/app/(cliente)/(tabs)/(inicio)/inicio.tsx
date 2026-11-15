import { router } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import Tarjeta from '@/components/Tarjeta';
import { useSesionStore } from '@/store/useSesionStore';

export default function InicioScreen() {
  const usuario = useSesionStore((s) => s.usuario);

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      <Text className="font-titulo text-2xl text-primary">Hola, {usuario?.nombre ?? 'cliente'}</Text>
      <Text className="mb-6 font-texto text-base text-secondary">¿Qué quieres hacer hoy?</Text>

      <Tarjeta
        titulo="Reservar cita"
        subtitulo="Elige profesional, servicios y horario"
        icono="cut-outline"
        onPress={() => router.push('/reservar')}
      />
      <Tarjeta
        titulo="El local"
        subtitulo="Cómo llegar a la barbería"
        icono="map-outline"
        onPress={() => router.push('/mapa')}
      />
      <Tarjeta
        titulo="Política de reservas"
        subtitulo="Tolerancia, multas y cancelación"
        icono="document-text-outline"
        onPress={() => router.push('/politica')}
      />
    </ScrollView>
  );
}
