// Horario semanal (RF-04): una semana a la vez, con navegación entre semanas. La
// disponibilidad la calcula useDisponibilidadSemanal y la dibuja SelectorSemana.
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import Boton from '@/components/Boton';
import PantallaPendiente from '@/components/PantallaPendiente';
import SelectorSemana, { type SeleccionFranja } from '@/components/SelectorSemana';
import { useDisponibilidadSemanal } from '@/hooks/useDisponibilidadSemanal';
import { aBogota, franjaLibre, instanteDeFranja, lunesDe } from '@/lib/disponibilidad';
import { etiquetaDia, formatoHora } from '@/lib/fechas';
import { faltaServicioPrincipal, totalSeleccion } from '@/lib/reserva';
import { useReservaStore } from '@/store/useReservaStore';

export default function HorarioScreen() {
  const profesional = useReservaStore((s) => s.profesional);
  const servicios = useReservaStore((s) => s.servicios);
  const elegirInicio = useReservaStore((s) => s.elegirInicio);

  const lunesActual = lunesDe(aBogota(new Date()).fecha);
  const [lunes, setLunes] = useState(lunesActual);
  const [seleccion, setSeleccion] = useState<SeleccionFranja | null>(null);

  const total = totalSeleccion(servicios);
  const disponibilidad = useDisponibilidadSemanal(profesional?.id ?? '', total.duracionMin, lunes);

  if (!profesional || servicios.length === 0 || faltaServicioPrincipal(servicios)) {
    return (
      <PantallaPendiente
        icono="cut-outline"
        mensaje="Primero elige un profesional y al menos un servicio principal."
        acciones={[{ texto: 'Elegir profesional', onPress: () => router.navigate('/reservar') }]}
      />
    );
  }

  // Si al refrescar la franja elegida dejó de estar libre (otro cliente la tomó), no se puede seguir.
  const seleccionLibre =
    seleccion !== null && franjaLibre(disponibilidad.dias, seleccion.fecha, seleccion.inicioMin);

  const continuar = () => {
    if (!seleccion || !seleccionLibre) return;
    elegirInicio(instanteDeFranja(seleccion.fecha, seleccion.inicioMin));
    router.push('/reservar/resumen');
  };

  return (
    <View className="flex-1 bg-fondo">
      <SelectorSemana
        lunes={lunes}
        lunesActual={lunesActual}
        onCambiarLunes={setLunes}
        disponibilidad={disponibilidad}
        profesional={profesional.nombre}
        duracionMin={total.duracionMin}
        seleccion={seleccion}
        onElegir={setSeleccion}
      />

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
