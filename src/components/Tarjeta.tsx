// Tarjeta reutilizable para profesionales, productos y citas.
// Si no hay imagen muestra un ícono (alternativa cuando falta la foto).
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Texto a la derecha, por ejemplo el precio. */
  detalle?: string;
  imagen?: string | null;
  icono?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export default function Tarjeta({
  titulo,
  subtitulo,
  detalle,
  imagen,
  icono = 'person',
  onPress,
}: Props) {
  const [imagenFallo, setImagenFallo] = useState(false);
  const mostrarImagen = Boolean(imagen) && !imagenFallo;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="mb-3 flex-row items-center rounded-xl border border-borde bg-fondo p-3 active:opacity-80"
    >
      {mostrarImagen ? (
        <Image
          source={{ uri: imagen ?? undefined }}
          style={{ width: 56, height: 56, borderRadius: 28 }}
          contentFit="cover"
          transition={200}
          onError={() => setImagenFallo(true)}
          accessibilityLabel={titulo}
        />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-full bg-borde">
          <Ionicons name={icono} size={26} color="#6B6B6B" />
        </View>
      )}

      <View className="ml-3 flex-1">
        <Text className="font-texto text-lg text-primary" numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text className="font-texto text-sm text-secondary" numberOfLines={2}>
            {subtitulo}
          </Text>
        ) : null}
      </View>

      {detalle ? <Text className="ml-2 font-texto text-base text-primary">{detalle}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={20} color="#9A9A9A" /> : null}
    </Pressable>
  );
}
