// Cotización, "Tu selección para llevar" (RF-10, RN-11): bolsa de Zustand con contador de 1 a 10,
// subtotales, total, cita opcional y envío por WhatsApp. Es una cotización, no una compra: la app
// no cobra ni confirma la entrega, y nunca dice que la cotización se envió (RN-14).
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import Chip from '@/components/Chip';
import PantallaPendiente from '@/components/PantallaPendiente';
import { NEGOCIO } from '@/config/negocio';
import { useMisCitas } from '@/hooks/useCita';
import { codigoCita } from '@/lib/codigoCita';
import { subtotalLinea, totalCotizacion } from '@/lib/cotizacion';
import { formatoCOP } from '@/lib/dinero';
import { mensajeDeError } from '@/lib/errores';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { enlaceWhatsApp, mensajeCotizacion } from '@/lib/whatsapp';
import { separarCitas } from '@/models/cita.mapper';
import { useCarritoStore } from '@/store/useCarritoStore';

function Contador({
  cantidad,
  nombre,
  onCambiar,
}: {
  cantidad: number;
  nombre: string;
  onCambiar: (nueva: number) => void;
}) {
  const enMinimo = cantidad <= NEGOCIO.cantidadMinima;
  const enMaximo = cantidad >= NEGOCIO.cantidadMaxima;
  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={() => onCambiar(cantidad - 1)}
        disabled={enMinimo}
        accessibilityRole="button"
        accessibilityLabel={`Quitar una unidad de ${nombre}`}
        accessibilityState={{ disabled: enMinimo }}
        className={`h-10 w-10 items-center justify-center rounded-full border border-primary ${
          enMinimo ? 'opacity-30' : ''
        }`}
      >
        <Ionicons name="remove" size={20} color="#111111" />
      </Pressable>
      <Text className="w-10 text-center font-titulo text-lg text-primary">{cantidad}</Text>
      <Pressable
        onPress={() => onCambiar(cantidad + 1)}
        disabled={enMaximo}
        accessibilityRole="button"
        accessibilityLabel={`Agregar una unidad de ${nombre}`}
        accessibilityState={{ disabled: enMaximo }}
        className={`h-10 w-10 items-center justify-center rounded-full border border-primary ${
          enMaximo ? 'opacity-30' : ''
        }`}
      >
        <Ionicons name="add" size={20} color="#111111" />
      </Pressable>
    </View>
  );
}

/** "Asociar a una cita (opcional)": próximas citas del cliente. */
function SelectorCita({
  citaId,
  onElegir,
}: {
  citaId: string | null;
  onElegir: (id: string | null) => void;
}) {
  const { data, isPending, isError, error, refetch } = useMisCitas();
  const proximas = useMemo(() => separarCitas(data ?? [], Date.now()).proximas, [data]);

  return (
    <View className="mb-4 rounded-xl border border-borde p-4">
      <Text className="mb-2 font-texto text-lg text-primary">Asociar a una cita (opcional)</Text>
      {isPending ? (
        <Text className="font-texto text-sm text-secondary">Cargando tus citas…</Text>
      ) : isError ? (
        <View>
          <Text className="mb-2 font-texto text-sm text-peligro">{mensajeDeError(error)}</Text>
          <Boton variante="borde" onPress={() => void refetch()}>
            Reintentar
          </Boton>
        </View>
      ) : proximas.length === 0 ? (
        <Text className="font-texto text-sm text-secondary">
          No tienes citas próximas. Puedes enviar la cotización sola.
        </Text>
      ) : (
        <View className="flex-row flex-wrap">
          <Chip etiqueta="Sin cita" activo={citaId === null} onPress={() => onElegir(null)} />
          {proximas.map((c) => (
            <Chip
              key={c.id}
              etiqueta={`${codigoCita(c.id)} · ${formatoFechaHoraBogota(c.inicio)} · ${c.profesional}`}
              activo={citaId === c.id}
              onPress={() => onElegir(c.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function Cotizacion() {
  const items = useCarritoStore((s) => s.items);
  const cambiarCantidad = useCarritoStore((s) => s.cambiarCantidad);
  const quitar = useCarritoStore((s) => s.quitar);
  const vaciar = useCarritoStore((s) => s.vaciar);
  const { data: citas } = useMisCitas();
  const [citaId, setCitaId] = useState<string | null>(null);
  const [errorWhatsApp, setErrorWhatsApp] = useState(false);

  if (items.length === 0) {
    return (
      <PantallaPendiente
        icono="bag-outline"
        mensaje="Tu bolsa está vacía. Agrega productos para armar tu cotización."
        acciones={[
          {
            texto: 'Ver productos',
            onPress: () => router.navigate('/productos'),
          },
        ]}
      />
    );
  }

  const { total, unidades } = totalCotizacion(
    items.map((i) => ({ precio: i.producto.precio, cantidad: i.cantidad })),
  );
  // Si la cita elegida ya no está (se canceló o pasó), el mensaje sale sin cita.
  const cita = citas?.find((c) => c.id === citaId) ?? null;

  const confirmarVaciar = () =>
    Alert.alert('Vaciar bolsa', '¿Quitar todos los productos de la cotización?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Vaciar', style: 'destructive', onPress: vaciar },
    ]);

  const enviar = async () => {
    setErrorWhatsApp(false);
    const mensaje = mensajeCotizacion({
      productos: items.map((i) => ({
        nombre: i.producto.nombre,
        precio: i.producto.precio,
        cantidad: i.cantidad,
      })),
      cita: cita
        ? {
            codigo: codigoCita(cita.id),
            fechaHora: formatoFechaHoraBogota(cita.inicio),
            profesional: cita.profesional,
          }
        : null,
    });
    try {
      await Linking.openURL(enlaceWhatsApp(mensaje));
    } catch {
      setErrorWhatsApp(true);
    }
  };

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 16 }}>
      <Text className="font-titulo text-2xl text-primary">Tu selección para llevar.</Text>
      <Text className="mb-4 font-texto text-sm text-secondary">
        {unidades} {unidades === 1 ? 'unidad' : 'unidades'} · Cantidades de {NEGOCIO.cantidadMinima}{' '}
        a {NEGOCIO.cantidadMaxima} por producto. La disponibilidad se confirma con el local.
      </Text>

      {items.map(({ producto, cantidad }) => (
        <View key={producto.id} className="mb-3 rounded-xl border border-borde p-4">
          <View className="flex-row items-start">
            <View className="flex-1">
              <Text className="font-texto text-lg text-primary">{producto.nombre}</Text>
              <Text className="font-texto text-sm text-secondary">
                {formatoCOP(producto.precio)} c/u
              </Text>
            </View>
            <Pressable
              onPress={() => quitar(producto.id)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${producto.nombre}`}
            >
              <Ionicons name="trash-outline" size={22} color="#6B6B6B" />
            </Pressable>
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <Contador
              cantidad={cantidad}
              nombre={producto.nombre}
              onCambiar={(nueva) => cambiarCantidad(producto.id, nueva)}
            />
            <Text className="font-texto text-base text-primary">
              Subtotal {formatoCOP(subtotalLinea({ precio: producto.precio, cantidad }))}
            </Text>
          </View>
        </View>
      ))}

      <View className="mb-4 flex-row items-center justify-between border-t border-borde pt-4">
        <Text className="font-texto text-lg text-primary">Total de productos</Text>
        <Text className="font-titulo text-xl text-primary">{formatoCOP(total)}</Text>
      </View>

      <SelectorCita citaId={cita ? citaId : null} onElegir={setCitaId} />

      <View className="mb-4 rounded-xl bg-borde p-4">
        <Text className="font-texto text-base text-primary">Es una cotización, no una compra</Text>
        <Text className="font-texto text-sm text-secondary">
          Sin pago de productos en la app. Precios fijos del catálogo. La app no confirma la
          entrega: coordinas la disponibilidad, el retiro y el pago con el local por WhatsApp.
        </Text>
      </View>

      <Boton onPress={enviar}>Enviar cotización por WhatsApp</Boton>
      <Text className="mt-2 text-center font-texto text-sm text-secondary">
        Se abre WhatsApp con el mensaje escrito; se envía cuando pulses enviar allí.
      </Text>
      {errorWhatsApp ? (
        <Text className="mt-2 text-center font-texto text-sm text-peligro">
          No pudimos abrir WhatsApp. Revisa que esté instalado o escribe al local al +
          {NEGOCIO.whatsapp}.
        </Text>
      ) : null}

      <Boton variante="texto" className="mt-4" onPress={confirmarVaciar}>
        Vaciar bolsa
      </Boton>
    </ScrollView>
  );
}
