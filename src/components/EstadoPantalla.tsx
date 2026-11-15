// Estado de carga, error (con Reintentar) o vacío para toda pantalla con datos remotos (RN-14).
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';

import Boton from '@/components/Boton';

type Props =
  | { tipo: 'carga'; mensaje?: string }
  | { tipo: 'error'; mensaje: string; onReintentar: () => void }
  | { tipo: 'vacio'; mensaje: string; icono?: keyof typeof Ionicons.glyphMap };

export default function EstadoPantalla(props: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-fondo p-6">
      {props.tipo === 'carga' && (
        <>
          <ActivityIndicator size="large" color="#111111" />
          <Text className="mt-3 font-texto text-base text-secondary">
            {props.mensaje ?? 'Cargando…'}
          </Text>
        </>
      )}

      {props.tipo === 'error' && (
        <>
          <Ionicons name="cloud-offline-outline" size={48} color="#6B6B6B" />
          <Text className="my-4 text-center font-texto text-base text-primary">
            {props.mensaje}
          </Text>
          <Boton onPress={props.onReintentar}>Reintentar</Boton>
        </>
      )}

      {props.tipo === 'vacio' && (
        <>
          <Ionicons name={props.icono ?? 'search-outline'} size={48} color="#9A9A9A" />
          <Text className="mt-4 text-center font-texto text-base text-secondary">
            {props.mensaje}
          </Text>
        </>
      )}
    </View>
  );
}
