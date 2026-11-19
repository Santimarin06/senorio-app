// Tarjeta reutilizable para profesionales, productos y citas.
// Si no hay imagen muestra un ícono (alternativa cuando falta la foto). Con imagenGrande la foto
// ocupa todo el ancho arriba del nombre (profesionales), para reconocer a cada uno.
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Texto a la derecha, por ejemplo el precio. */
  detalle?: string;
  imagen?: string | null;
  icono?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** Foto grande arriba, a todo el ancho, en vez del círculo pequeño a la izquierda. */
  imagenGrande?: boolean;
  /** Contenido debajo de la fila, por ejemplo el botón Agregar del cotizador. */
  children?: ReactNode;
}

export default function Tarjeta({
  titulo,
  subtitulo,
  detalle,
  imagen,
  icono = 'person',
  onPress,
  imagenGrande = false,
  children,
}: Props) {
  const [imagenFallo, setImagenFallo] = useState(false);
  const mostrarImagen = Boolean(imagen) && !imagenFallo;

  return (
    <View className="mb-3 rounded-xl border border-borde bg-fondo p-3">
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        className="active:opacity-80"
      >
        {imagenGrande ? (
          mostrarImagen ? (
            <Image
              source={{ uri: imagen ?? undefined }}
              style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 10 }}
              contentFit="cover"
              contentPosition="top"
              transition={200}
              onError={() => setImagenFallo(true)}
              accessibilityLabel={titulo}
            />
          ) : (
            <View
              className="w-full items-center justify-center rounded-[10px] bg-borde"
              style={{ aspectRatio: 4 / 3 }}
            >
              <Ionicons name={icono} size={64} color="#6B6B6B" />
            </View>
          )
        ) : null}
        <View className={`flex-row items-center ${imagenGrande ? 'mt-3' : ''}`}>
          {imagenGrande ? null : mostrarImagen ? (
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

          <View className={`flex-1 ${imagenGrande ? '' : 'ml-3'}`}>
            <Text className="font-texto text-lg text-primary" numberOfLines={1}>
              {titulo}
            </Text>
            {subtitulo ? (
              <Text className="font-texto text-sm text-secondary" numberOfLines={2}>
                {subtitulo}
              </Text>
            ) : null}
          </View>

          {detalle ? (
            <Text className="ml-2 font-texto text-base text-primary">{detalle}</Text>
          ) : null}
          {onPress ? <Ionicons name="chevron-forward" size={20} color="#9A9A9A" /> : null}
        </View>
      </Pressable>
      {children ? <View className="mt-3">{children}</View> : null}
    </View>
  );
}
