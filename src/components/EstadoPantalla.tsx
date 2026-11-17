// Estado de carga, error (con Reintentar) o vacío para toda pantalla con datos remotos (RN-14).
// Si el error es de red, el título dice "Sin conexión" como el mockup. Si la conexión vuelve,
// la consulta se reintenta sola (src/app/_layout.tsx) y la pantalla se recupera.
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import { esSinConexion, mensajeDeError } from '@/lib/errores';

export interface AccionEstado {
  texto: string;
  onPress: () => void;
}

type Props =
  | { tipo: 'carga'; mensaje?: string }
  | { tipo: 'error'; error: unknown; mensaje?: string; onReintentar: () => void }
  | {
      tipo: 'vacio';
      mensaje: string;
      titulo?: string;
      icono?: keyof typeof Ionicons.glyphMap;
      accion?: AccionEstado;
    };

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
          <Ionicons
            name={esSinConexion(props.error) ? 'cloud-offline-outline' : 'alert-circle-outline'}
            size={48}
            color="#6B6B6B"
          />
          <Text className="mt-4 text-center font-titulo text-lg text-primary">
            {esSinConexion(props.error) ? 'Sin conexión' : 'Algo salió mal'}
          </Text>
          <Text className="mb-4 mt-1 text-center font-texto text-base text-secondary">
            {props.mensaje ?? mensajeDeError(props.error)}
          </Text>
          <Boton onPress={props.onReintentar}>Reintentar</Boton>
        </>
      )}

      {props.tipo === 'vacio' && (
        <>
          <Ionicons name={props.icono ?? 'search-outline'} size={48} color="#9A9A9A" />
          {props.titulo ? (
            <Text className="mt-4 text-center font-titulo text-lg text-primary">{props.titulo}</Text>
          ) : null}
          <Text
            className={`${props.titulo ? 'mt-1' : 'mt-4'} text-center font-texto text-base text-secondary`}
          >
            {props.mensaje}
          </Text>
          {props.accion ? (
            <Boton variante="borde" className="mt-4" onPress={props.accion.onPress}>
              {props.accion.texto}
            </Boton>
          ) : null}
        </>
      )}
    </View>
  );
}
