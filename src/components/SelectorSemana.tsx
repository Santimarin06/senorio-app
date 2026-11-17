// Selector de horario de una semana (RF-04, RF-14): flechas entre semanas, los siete días y
// las franjas del día visible con SelectorFranja. Lo usan reservar y reagendar. Las franjas
// ocupadas, pasadas, del almuerzo y los días cerrados se ven deshabilitados. La
// disponibilidad la calcula useDisponibilidadSemanal en la pantalla; aquí solo se dibuja.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import SelectorFranja from '@/components/SelectorFranja';
import type { DisponibilidadSemanal } from '@/hooks/useDisponibilidadSemanal';
import { sumarDias, type DiaDisponibilidad } from '@/lib/disponibilidad';
import { etiquetaDia } from '@/lib/fechas';

export interface SeleccionFranja {
  fecha: string;
  inicioMin: number;
}

interface Props {
  /** Lunes de la semana visible y el de la semana actual ('YYYY-MM-DD'). */
  lunes: string;
  lunesActual: string;
  onCambiarLunes: (lunes: string) => void;
  disponibilidad: DisponibilidadSemanal;
  profesional: string;
  duracionMin: number;
  seleccion: SeleccionFranja | null;
  onElegir: (seleccion: SeleccionFranja) => void;
}

/** Día que se muestra al abrir una semana: el primero con franjas libres, o el primero abierto. */
const diaInicial = (dias: DiaDisponibilidad[]): string | null =>
  (dias.find((d) => d.franjas.some((f) => f.estado === 'libre')) ?? dias.find((d) => d.abierto) ?? dias[0])
    ?.fecha ?? null;

export default function SelectorSemana({
  lunes,
  lunesActual,
  onCambiarLunes,
  disponibilidad,
  profesional,
  duracionMin,
  seleccion,
  onElegir,
}: Props) {
  const [fechaElegida, setFechaElegida] = useState<string | null>(null);
  const { dias, cargando, error, reintentar } = disponibilidad;

  const cambiarSemana = (semanas: number) => {
    onCambiarLunes(sumarDias(lunes, semanas * 7));
    setFechaElegida(null);
  };

  const fechaVisible =
    fechaElegida && dias.some((d) => d.fecha === fechaElegida) ? fechaElegida : diaInicial(dias);
  const dia = dias.find((d) => d.fecha === fechaVisible);
  const semanaSinFranjas = dias.length > 0 && !dias.some((d) => d.franjas.some((f) => f.estado === 'libre'));

  return (
    <View className="flex-1">
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
        <EstadoPantalla tipo="error" error={error} onReintentar={reintentar} />
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
                  No quedan horarios libres esta semana con {profesional}.
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
                    Este día no alcanza para {duracionMin} minutos de servicio.
                  </Text>
                ) : (
                  <SelectorFranja
                    franjas={dia.franjas}
                    seleccionada={seleccion?.fecha === dia.fecha ? seleccion.inicioMin : null}
                    onElegir={(f) => onElegir({ fecha: dia.fecha, inicioMin: f.inicioMin })}
                  />
                )}
              </>
            ) : null}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}
