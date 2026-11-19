// Productos, "El cuidado sigue en casa" (RF-10, RF-11): catálogo remoto con búsqueda, filtro
// por categoría y botón Agregar a la bolsa de cotización (Zustand). Cuadrícula de dos columnas
// como en el mockup, con la nota de precios fijos al final.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import TarjetaProducto from '@/components/TarjetaProducto';
import { useProductos } from '@/hooks/useProductos';
import { filtrarProductos, totalCotizacion, type FiltroCategoria } from '@/lib/cotizacion';
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
        <Text className="font-texto text-xs uppercase tracking-widest text-secondary">
          Productos
        </Text>
        <Text className="mt-1 font-titulo text-2xl text-primary">El cuidado sigue en casa.</Text>
        <View className="mt-4 flex-row items-center rounded-xl bg-borde/60 px-4">
          <Ionicons name="search-outline" size={20} color="#6B6B6B" />
          <TextInput
            value={consulta}
            onChangeText={setConsulta}
            placeholder="Buscar productos"
            placeholderTextColor="#9A9A9A"
            className="ml-2 flex-1 py-3 font-texto text-base text-primary"
            accessibilityLabel="Buscar productos"
          />
        </View>
        <View className="mt-3 flex-row items-center">
          {/* Selector de categoría segmentado, como en el mockup */}
          <View
            className="flex-1 flex-row rounded-xl bg-borde/60 p-1"
            accessibilityRole="radiogroup"
          >
            {CATEGORIAS.map((c) => {
              const activo = categoria === c.valor;
              return (
                <Pressable
                  key={c.valor}
                  onPress={() => setCategoria(c.valor)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: activo }}
                  className={`flex-1 items-center rounded-lg py-2 active:opacity-80 ${
                    activo ? 'bg-fondo' : ''
                  }`}
                >
                  <Text
                    className={`font-texto text-sm ${activo ? 'text-primary' : 'text-secondary'}`}
                  >
                    {c.etiqueta}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => router.push('/cotizacion')}
            accessibilityRole="button"
            accessibilityLabel={`Ver bolsa de cotización, ${unidades} unidades`}
            className="ml-3 flex-row items-center rounded-full bg-primary px-4 py-2 active:opacity-80"
          >
            <Ionicons name="bag-outline" size={16} color="#FFFFFF" />
            <Text className="ml-1 font-texto text-sm text-white">Bolsa · {unidades}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 16 }}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        onRefresh={refetch}
        refreshing={isRefetching}
        renderItem={({ item }) => (
          <TarjetaProducto
            producto={item}
            enBolsa={items.some((i) => i.producto.id === item.id)}
            onAgregar={() => agregar(item)}
            onVerBolsa={() => router.push('/cotizacion')}
          />
        )}
        ListFooterComponent={
          filtrados.length > 0 ? (
            <Text className="font-texto text-sm text-secondary">
              Precios fijos para tu cotización. Consulta disponibilidad con el local; no se cobra en
              la app.
            </Text>
          ) : undefined
        }
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
