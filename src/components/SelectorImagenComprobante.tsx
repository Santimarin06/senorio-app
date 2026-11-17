// Elegir la imagen del comprobante (RF-13): cámara o galería, aviso de permiso denegado o
// bloqueado (con salida a Ajustes), error de archivo y vista previa. No sube nada: la imagen
// queda en el estado del hook hasta que la pantalla la envía.
import { Image } from 'expo-image';
import { ActivityIndicator, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import { COMPROBANTE } from '@/config/negocio';
import { formatoTamano } from '@/lib/comprobante';
import type { useElegirImagen } from '@/hooks/useElegirImagen';

interface Props {
  selector: ReturnType<typeof useElegirImagen>;
  deshabilitado?: boolean;
}

export default function SelectorImagenComprobante({ selector, deshabilitado = false }: Props) {
  const { permisoCamara, imagen, error, leyendo } = selector;
  const inactivo = deshabilitado || leyendo;

  return (
    <View className="mb-4">
      <View className="flex-row">
        <Boton
          variante="borde"
          className="mr-2 flex-1"
          disabled={inactivo}
          onPress={() => void selector.tomarFoto()}
        >
          Tomar foto
        </Boton>
        <Boton
          variante="borde"
          className="flex-1"
          disabled={inactivo}
          onPress={() => void selector.elegirDeGaleria()}
        >
          Galería
        </Boton>
      </View>

      {permisoCamara === 'denegado' ? (
        <Text className="mt-2 font-texto text-sm text-peligro">
          Sin permiso de cámara no podemos tomar la foto. Pulsa “Tomar foto” para permitirlo o usa
          la galería.
        </Text>
      ) : null}
      {permisoCamara === 'bloqueado' ? (
        <View className="mt-2">
          <Text className="font-texto text-sm text-peligro">
            El permiso de cámara está bloqueado. Actívalo en Ajustes o usa la galería.
          </Text>
          <Boton variante="texto" disabled={inactivo} onPress={selector.abrirAjustes}>
            Abrir Ajustes
          </Boton>
        </View>
      ) : null}

      {leyendo ? (
        <View className="mt-3 flex-row items-center">
          <ActivityIndicator color="#111111" />
          <Text className="ml-2 font-texto text-sm text-secondary">Revisando la imagen…</Text>
        </View>
      ) : null}
      {error ? <Text className="mt-2 font-texto text-sm text-peligro">{error}</Text> : null}

      {imagen ? (
        <View className="mt-3 rounded-xl border border-borde p-3">
          <Image
            source={{ uri: imagen.uri }}
            contentFit="contain"
            style={{ width: '100%', height: 220 }}
            accessibilityLabel="Vista previa del comprobante"
          />
          <Text className="mt-2 font-texto text-sm text-primary" numberOfLines={1}>
            {imagen.nombre}
          </Text>
          <Text className="font-texto text-sm text-secondary">
            {imagen.mime === 'image/png' ? 'PNG' : 'JPG'} · {formatoTamano(imagen.tamano)} · Aún no
            se ha enviado
          </Text>
        </View>
      ) : null}

      <Text className="mt-2 font-texto text-sm text-secondary">
        Formatos JPG o PNG · hasta {formatoTamano(COMPROBANTE.tamanoMaximoBytes)}.
      </Text>
    </View>
  );
}
