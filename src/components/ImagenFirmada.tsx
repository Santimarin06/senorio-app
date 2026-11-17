// Imagen de un comprobante del bucket privado, vista por el administrador (RF-28) con una URL
// firmada de Storage. "Ampliar imagen" la abre a pantalla completa dentro de la app.
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import { useUrlFirmada } from '@/hooks/useRevision';
import { mensajeDeError } from '@/lib/errores';

export default function ImagenFirmada({ archivoPath }: { archivoPath: string }) {
  const url = useUrlFirmada(archivoPath);
  const [ampliada, setAmpliada] = useState(false);
  const [falloImagen, setFalloImagen] = useState(false);
  const nombre = archivoPath.split('/').pop() ?? archivoPath;

  const reintentar = () => {
    setFalloImagen(false);
    void url.refetch();
  };

  return (
    <View className="my-3 rounded-xl border border-borde p-3">
      {url.isPending ? (
        <View className="h-48 items-center justify-center">
          <ActivityIndicator color="#111111" />
          <Text className="mt-2 font-texto text-sm text-secondary">Cargando la imagen…</Text>
        </View>
      ) : url.isError || falloImagen ? (
        <View className="h-48 items-center justify-center">
          <Text className="mb-2 text-center font-texto text-sm text-secondary">
            {url.isError ? mensajeDeError(url.error) : 'No pudimos mostrar la imagen.'}
          </Text>
          <Boton variante="borde" onPress={reintentar}>
            Reintentar
          </Boton>
        </View>
      ) : (
        <Pressable
          onPress={() => setAmpliada(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel="Ampliar imagen del comprobante"
        >
          <Image
            source={{ uri: url.data }}
            contentFit="contain"
            style={{ width: '100%', height: 200 }}
            onError={() => setFalloImagen(true)}
          />
        </Pressable>
      )}
      <Text className="mt-2 font-texto text-xs text-secondary" numberOfLines={1}>
        {nombre}
      </Text>
      <Boton
        variante="texto"
        disabled={!url.data || falloImagen}
        onPress={() => setAmpliada(true)}
      >
        Ampliar imagen
      </Boton>

      <Modal visible={ampliada} animationType="fade" onRequestClose={() => setAmpliada(false)}>
        <View className="flex-1 bg-black">
          {url.data ? (
            <Image
              source={{ uri: url.data }}
              contentFit="contain"
              style={{ flex: 1 }}
              accessibilityLabel="Comprobante ampliado"
            />
          ) : null}
          <View className="p-6">
            <Boton variante="borde" onPress={() => setAmpliada(false)}>
              Cerrar
            </Boton>
          </View>
        </View>
      </Modal>
    </View>
  );
}
