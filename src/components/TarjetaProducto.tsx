// Tarjeta de producto en cuadrícula de dos columnas (mockup de Productos): foto cuadrada grande,
// nombre, descripción corta, precio y botón cuadrado para agregar a la bolsa de cotización.
// Si el producto ya está en la bolsa, el botón muestra un chulo y lleva a la cotización.
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatoCOP } from '@/lib/dinero';
import type { Producto } from '@/types/entidades';

interface Props {
  producto: Producto;
  enBolsa: boolean;
  onAgregar: () => void;
  onVerBolsa: () => void;
}

export default function TarjetaProducto({ producto, enBolsa, onAgregar, onVerBolsa }: Props) {
  const [imagenFallo, setImagenFallo] = useState(false);
  const mostrarImagen = Boolean(producto.foto) && !imagenFallo;

  return (
    <View className="mb-5 flex-1">
      {mostrarImagen ? (
        <Image
          source={{ uri: producto.foto ?? undefined }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
          contentFit="cover"
          transition={200}
          onError={() => setImagenFallo(true)}
          accessibilityLabel={producto.nombre}
        />
      ) : (
        <View
          className="w-full items-center justify-center rounded-xl bg-borde"
          style={{ aspectRatio: 1 }}
        >
          <Ionicons name="bag-outline" size={48} color="#6B6B6B" />
        </View>
      )}

      <Text className="mt-2 font-titulo text-base text-primary" numberOfLines={1}>
        {producto.nombre}
      </Text>
      <Text className="font-texto text-sm text-secondary" numberOfLines={2}>
        {producto.descripcion}
      </Text>

      <View className="mt-auto flex-row items-center justify-between pt-2">
        <Text className="font-titulo text-lg text-primary">{formatoCOP(producto.precio)}</Text>
        <Pressable
          onPress={enBolsa ? onVerBolsa : onAgregar}
          accessibilityRole="button"
          accessibilityLabel={
            enBolsa
              ? `${producto.nombre} ya está en la bolsa, ver cotización`
              : `Agregar ${producto.nombre}`
          }
          className={`h-11 w-11 items-center justify-center rounded-lg active:opacity-80 ${
            enBolsa ? 'border border-primary bg-fondo' : 'bg-primary'
          }`}
        >
          <Ionicons
            name={enBolsa ? 'checkmark' : 'add'}
            size={24}
            color={enBolsa ? '#111111' : '#FFFFFF'}
          />
        </Pressable>
      </View>
    </View>
  );
}
