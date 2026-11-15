// Horario semanal (RF-04): una semana a la vez, con navegación entre semanas. Las franjas
// ocupadas, pasadas, del almuerzo y los días cerrados se ven deshabilitados.
// La disponibilidad la calcula useDisponibilidadSemanal; esta pantalla solo la dibuja.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import PantallaPendiente from '@/components/PantallaPendiente';
import SelectorFranja from '@/components/SelectorFranja';
import { useDisponibilidadSemanal } from '@/hooks/useDisponibilidadSemanal';
import { aBogota, instanteDeFranja, lunesDe, sumarDias, type DiaDisponibilidad } from '@/lib/disponibilidad';
import { mensajeDeError } from '@/lib/errores';
import { etiquetaDia, formatoHora } from '@/lib/fechas';
import { calcularTotalCita, faltaServicioPrincipal } from '@/lib/reserva';
import { useReservaStore } from '@/store/useReservaStore';

interface Seleccion {
  fecha: string;
  inicioMin: number;
}

/** Día que se muestra al abrir una semana: el primero con franjas libres, o el primero abierto. */
const diaInicial = (dias: DiaDisponibilidad[]): string | null =>
  (dias.find((d) => d.franjas.some((f) => f.estado === 'libre')) ?? dias.find((d) => d.abierto) ?? dias[0])
    ?.fecha ?? null;

export default function HorarioScreen() {
  const profesional = useReservaStore((s) => s.profesional);
  const servicios = useReservaStore((s) => s.servicios);
  const elegirInicio = useReservaStore((s) => s.elegirInicio);

  const lunesActual = lunesDe(aBogota(new Date()).fecha);
  const [lunes, setLunes] = useState(lunesActual);
  const [fechaElegida, setFechaElegida] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);

  const { dias, cargando, error, reintentar } = useDisponibilidadSemanal(
    profesional?.id ?? '',
    servicios,
    lunes,
  );

  if (!profesional || servicios.length === 0 || faltaServicioPrincipal(servicios)) {
    return (
      <PantallaPendiente
        icono="cut-outline"
        mensaje="Primero elige un profesional y al menos un servicio principal."
        acciones={[{ texto: 'Elegir profesional', onPress: () => router.navigate('/reservar') }]}
      />
    );
  }

  const cambiarSemana = (semanas: number) => {
    setLunes(sumarDias(lunes, semanas * 7));
    setFechaElegida(null);
  };

  const fechaVisible =
    fechaElegida && dias.some((d) => d.fecha === fechaElegida) ? fechaElegida : diaInicial(dias);
  const dia = dias.find((d) => d.fecha === fechaVisible);
  const semanaSinFranjas = dias.length > 0 && !dias.some((d) => d.franjas.some((f) => f.estado === 'libre'));
  const total = calcularTotalCita(servicios);
  // Si al refrescar la franja elegida dejó de estar libre (otro cliente la tomó), no se puede seguir.
  const seleccionLibre =
    seleccion !== null &&
    dias.some(
      (d) =>
        d.fecha === seleccion.fecha &&
        d.franjas.some((f) => f.inicioMin === seleccion.inicioMin && f.estado === 'libre'),
    );

  const continuar = () => {
    if (!seleccion || !seleccionLibre) return;
    elegirInicio(instanteDeFranja(seleccion.fecha, seleccion.inicioMin));
    router.push('/reservar/resumen');
  };

  return (
    <View className="flex-1 bg-fondo">
      {/* Semana */}
      <View className="flex-row items-center justify-between px-4 pt-4">
        <Pressable
          onPress={() => cambiarSemana(-1)}
          disabled={lunes <= lunesActual}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Semana anterior"
          className={lunes <= lunesActual ? 'opacity-30' : ''}
        >
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </Pressable>
        <Text className="font-texto text-base text-primary">
          {`Semana del ${etiquetaDia(lunes).numero} al ${etiquetaDia(sumarDias(lunes, 6)).largo.replace(/^\S+ /, '')}`}
        </Text>
        <Pressable
          onPress={() => cambiarSemana(1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Semana siguiente"
        >
          <Ionicons name="chevron-forward" size={24} color="#111111" />
        </Pressable>
      </View>

      {cargando ? <EstadoPantalla tipo="carga" mensaje="Buscando horarios…" /> : null}
      {!cargando && error ? (
        <EstadoPantalla tipo="error" mensaje={mensajeDeError(error)} onReintentar={reintentar} />
      ) : null}

      {!cargando && !error && dias.length > 0 ? (
        <>
          {/* Días */}
          <View className="flex-row justify-between px-2 py-3">
            {dias.map((d) => {
              const activo = d.fecha === fechaVisible;
              const { corto, numero } = etiquetaDia(d.fecha);
              return (
                <Pressable
                  key={d.fecha}
                  onPress={() => setFechaElegida(d.fecha)}
                  disabled={!d.abierto}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activo, disabled: !d.abierto }}
                  accessibilityLabel={`${etiquetaDia(d.fecha).largo}${d.abierto ? '' : ', cerrado'}`}
                  className={`mx-0.5 flex-1 items-center rounded-lg py-2 ${
                    activo ? 'bg-primary' : d.abierto ? 'bg-fondo' : 'bg-borde opacity-50'
                  }`}
                >
                  <Text className={`font-texto text-xs ${activo ? 'text-white' : 'text-secondary'}`}>{corto}</Text>
                  <Text className={`font-titulo text-base ${activo ? 'text-white' : 'text-primary'}`}>{numero}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {semanaSinFranjas ? (
              <View className="mb-4 rounded-lg border border-borde p-4">
                <Text className="mb-3 font-texto text-base text-primary">
                  No quedan horarios libres esta semana con {profesional.nombre}.
                </Text>
                <Boton variante="borde" onPress={() => cambiarSemana(1)}>
                  Ver la semana siguiente
                </Boton>
              </View>
            ) : null}

            {dia ? (
              <>
                <Text className="mb-2 font-texto text-lg text-primary">{etiquetaDia(dia.fecha).largo}</Text>
                {!dia.abierto ? (
                  <Text className="font-texto text-base text-secondary">El local no atiende este día.</Text>
                ) : dia.franjas.length === 0 ? (
                  <Text className="font-texto text-base text-secondary">
                    Este día no alcanza para {total.duracionMin} minutos de servicio.
                  </Text>
                ) : (
                  <SelectorFranja
                    franjas={dia.franjas}
                    seleccionada={seleccion?.fecha === dia.fecha ? seleccion.inicioMin : null}
                    onElegir={(f) => setSeleccion({ fecha: dia.fecha, inicioMin: f.inicioMin })}
                  />
                )}
              </>
            ) : null}
          </ScrollView>
        </>
      ) : null}

      {/* Resumen y continuar */}
      <View className="border-t border-borde p-4">
        <Text className="font-texto text-base text-primary">
          {seleccion
            ? `${etiquetaDia(seleccion.fecha).largo}, ${formatoHora(seleccion.inicioMin)} · ${total.duracionMin} min`
            : `Elige un horario · ${total.duracionMin} min con ${profesional.nombre}`}
        </Text>
        <Boton className="mt-3" disabled={!seleccionLibre} onPress={continuar}>
          Continuar
        </Boton>
      </View>
    </View>
  );
}
