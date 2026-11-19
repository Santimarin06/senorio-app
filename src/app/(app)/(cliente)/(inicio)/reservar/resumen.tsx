// Resumen y política (RF-05, RF-06, RN-13). Sin aceptar la política no se confirma.
// Confirmar llama a reservar_cita: la base calcula el total, valida las reglas y la
// restricción de exclusión impide la doble reserva. Solo con su respuesta se muestra
// la cita como registrada (RN-12, RN-14).
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import AvisoEscritura from '@/components/AvisoEscritura';
import Boton from '@/components/Boton';
import PantallaPendiente from '@/components/PantallaPendiente';
import { PUNTOS_POLITICA } from '@/components/pantallas/PoliticaReservas';
import { useMultaPendiente, useReservarCita } from '@/hooks/useCita';
import { esFranjaTomada, esSinConexion, mensajeDeReserva } from '@/lib/errores';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { formatoCOP, puedeReservar } from '@/lib/finanzas';
import { totalSeleccion } from '@/lib/reserva';
import { useReservaStore } from '@/store/useReservaStore';

export default function ResumenScreen() {
  const profesional = useReservaStore((s) => s.profesional);
  const servicios = useReservaStore((s) => s.servicios);
  const inicio = useReservaStore((s) => s.inicio);
  const reiniciar = useReservaStore((s) => s.reiniciar);

  const [acepta, setAcepta] = useState(false);
  const [franjaTomada, setFranjaTomada] = useState(false);
  const multa = useMultaPendiente();
  const reservar = useReservarCita();

  if (!profesional || servicios.length === 0 || !inicio) {
    return (
      <PantallaPendiente
        icono="time-outline"
        mensaje="Aún no has elegido un horario para tu cita."
        acciones={[{ texto: 'Elegir horario', onPress: () => router.navigate('/reservar/horario') }]}
      />
    );
  }

  const total = totalSeleccion(servicios);
  // Si la consulta falló no sabemos si hay multa: no se toma como cero, se bloquea.
  const errorMulta = multa.isError;
  const multaPendiente = multa.data ?? 0;
  const bloqueadoPorMulta = !errorMulta && !puedeReservar(multaPendiente);

  const confirmar = () => {
    reservar.mutate(
      { profesionalId: profesional.id, servicioIds: servicios.map((s) => s.id), inicio },
      {
        onSuccess: (citaId) => {
          reiniciar();
          router.replace({ pathname: '/reservar/confirmacion', params: { citaId } });
        },
        onError: (e) => {
          // Si otro cliente tomó la franja mientras este elegía, solo queda elegir otra: el
          // horario ya se está refrescando (useReservarCita invalida la disponibilidad).
          setFranjaTomada(esFranjaTomada(e));
        },
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      <View className="mb-6 rounded-xl border border-borde p-4">
        <Text className="font-titulo text-lg text-primary">{profesional.nombre}</Text>
        <Text className="mb-3 font-texto text-base text-secondary">{formatoFechaHoraBogota(inicio)}</Text>
        {servicios.map((s) => (
          <View key={s.id} className="flex-row justify-between">
            <Text className="font-texto text-base text-primary">{s.nombre}</Text>
            <Text className="font-texto text-base text-primary">{formatoCOP(s.precio)}</Text>
          </View>
        ))}
        <View className="mt-3 flex-row justify-between border-t border-borde pt-3">
          <Text className="font-texto text-base text-primary">Total · {total.duracionMin} min</Text>
          <Text className="font-titulo text-base text-primary">{formatoCOP(total.total)}</Text>
        </View>
      </View>

      <Text className="mb-2 font-texto text-lg text-primary">Política de reservas</Text>
      {PUNTOS_POLITICA.map((punto) => (
        <Text key={punto} className="mb-2 font-texto text-sm text-primary">
          • {punto}
        </Text>
      ))}
      <Pressable onPress={() => router.navigate('/politica')} accessibilityRole="link" hitSlop={8}>
        <Text className="font-texto text-sm text-primary underline">Leer política completa →</Text>
      </Pressable>

      <Pressable
        onPress={() => setAcepta((a) => !a)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acepta }}
        className="my-4 flex-row items-center"
      >
        <Ionicons name={acepta ? 'checkbox' : 'square-outline'} size={24} color="#111111" />
        <Text className="ml-3 flex-1 font-texto text-base text-primary">
          Leí y acepto la política de multas, tolerancia y cancelación.
        </Text>
      </Pressable>

      {/* RN-07 y RN-14: sin verificar la multa no se confirma. La selección se conserva. */}
      {errorMulta ? (
        <View className="mb-4 rounded-lg border border-peligro p-3">
          <Text className="font-texto text-sm text-peligro">
            No se pudo verificar si tienes multas. Revisa tu conexión e inténtalo de nuevo.
          </Text>
          <Boton
            variante="borde"
            className="mt-3"
            cargando={multa.isFetching}
            onPress={() => multa.refetch()}
          >
            Reintentar
          </Boton>
        </View>
      ) : null}

      {bloqueadoPorMulta ? (
        <View className="mb-4 rounded-lg border border-peligro p-3">
          <Text className="font-texto text-sm text-peligro">
            {`Tienes una multa pendiente de ${formatoCOP(multaPendiente)}. Mientras no la pagues o el local no la perdone, no puedes reservar. En tu Cuenta ves de qué cita es y cómo resolverla.`}
          </Text>
          {/* RF-15: el bloqueo lleva a la Cuenta, donde está el detalle y el contacto del local. */}
          <Boton variante="borde" className="mt-3" onPress={() => router.navigate('/cuenta')}>
            Ver mi multa
          </Boton>
        </View>
      ) : null}

      {/* RN-14: sin respuesta de la base nada quedó registrado y la selección sigue aquí. */}
      {reservar.isError ? (
        <AvisoEscritura error={reservar.error} mensaje={mensajeDeReserva(reservar.error)} className="mb-4" />
      ) : null}

      {franjaTomada ? (
        <Boton onPress={() => router.back()}>Elegir otro horario</Boton>
      ) : (
        <>
          <Boton
            onPress={confirmar}
            cargando={reservar.isPending}
            disabled={!acepta || errorMulta || bloqueadoPorMulta || multa.isPending}
          >
            {reservar.isError && esSinConexion(reservar.error) ? 'Reintentar al conectarte' : 'Confirmar cita'}
          </Boton>
          <Boton variante="borde" className="mt-3" onPress={() => router.back()}>
            Cambiar horario
          </Boton>
        </>
      )}
    </ScrollView>
  );
}
