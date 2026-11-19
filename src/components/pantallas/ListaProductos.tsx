// Productos, "El cuidado sigue en casa" (RF-10, RF-11): catálogo remoto con búsqueda, filtro
// por categoría y botón Agregar a la bolsa de cotización (Zustand).
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import Boton from '@/components/Boton';
import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import Tarjeta from '@/components/Tarjeta';
import { useProductos } from '@/hooks/useProductos';
import { filtrarProductos, totalCotizacion, type FiltroCategoria } from '@/lib/cotizacion';
import { formatoCOP } from '@/lib/dinero';
import { useCarritoStore } from '@/store/useCarritoStore';

const CATEGORIAS: { valor: FiltroCategoria; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'cabello', etiqueta: 'Cabello' },
  { valor: 'barba', etiqueta: 'Barba' },
];

export default function ListaProductos() {
  const { data, isPending, isError, error, refetch, isRefetching } = useProductos();
  const [consulta, setConsulta] = useState('');
  const [categoria, setCategoria] = useState<FiltroCategoria>('todos');

  const items = useCarritoStore((s) => s.items);
  const agregar = useCarritoStore((s) => s.agregar);
  const { unidades } = totalCotizacion(
    items.map((i) => ({ precio: i.producto.precio, cantidad: i.cantidad })),
  );

  const filtrados = useMemo(
    () => filtrarProductos(data ?? [], categoria, consulta),
    [data, categoria, consulta],
  );

  const limpiar = () => {
    setConsulta('');
    setCategoria('todos');
  };

  if (isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando productos…" />;
  if (isError) return <EstadoPantalla tipo="error" error={error} onReintentar={refetch} />;
  if (data.length === 0)
    return <EstadoPantalla tipo="vacio" mensaje="Todavía no hay productos en el catálogo." />;

  return (
    <View className="flex-1 bg-fondo">
      <View className="px-4 pt-4">
        <Text className="font-titulo text-2xl text-primary">El cuidado sigue en casa.</Text>
        <TextInput
          value={consulta}
          onChangeText={setConsulta}
          placeholder="Buscar productos"
          placeholderTextColor="#9A9A9A"
          className="mt-3 rounded-lg border border-borde px-4 py-3 font-texto text-base text-primary"
          accessibilityLabel="Buscar productos"
        />
        <View className="mt-3 flex-row flex-wrap items-center">
          {CATEGORIAS.map((c) => (
            <Chip
              key={c.valor}
              etiqueta={c.etiqueta}
              activo={categoria === c.valor}
              onPress={() => setCategoria(c.valor)}
            />
          ))}
          <Pressable
            onPress={() => router.push('/cotizacion')}
            accessibilityRole="button"
            accessibilityLabel={`Ver bolsa de cotización, ${unidades} unidades`}
            className="mb-2 ml-auto flex-row items-center rounded-full border border-primary px-4 py-2 active:opacity-80"
          >
            <Ionicons name="bag-outline" size={16} color="#111111" />
            <Text className="ml-1 font-texto text-sm text-primary">Bolsa · {unidades}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) => {
          const enBolsa = items.some((i) => i.producto.id === item.id);
          return (
            <Tarjeta
              titulo={item.nombre}
              subtitulo={item.descripcion}
              detalle={formatoCOP(item.precio)}
              imagen={item.foto}
              icono="bag-outline"
            >
              {enBolsa ? (
                <Boton
                  variante="borde"
                  onPress={() => agregar(item)}
                  accessibilityLabel={`Agregar una unidad de ${item.nombre}`}
                >
                  +1 unidad
                </Boton>
              ) : (
                <Boton onPress={() => agregar(item)} accessibilityLabel={`Agregar ${item.nombre}`}>
                  Agregar
                </Boton>
              )}
            </Tarjeta>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1">
            <EstadoPantalla tipo="vacio" mensaje="Ningún producto coincide con tu búsqueda." />
            <Boton variante="borde" className="mx-6" onPress={limpiar}>
              Limpiar búsqueda
            </Boton>
          </View>
        }
      />
    </View>
  );
}
