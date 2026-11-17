// Agenda del local (RF-22, RF-23, RF-24, mockup "El local, en orden"): citas de todos los
// profesionales de un día, con filtro por profesional y asistencia de cualquiera; abajo, los
// días laborables y los bloqueos. Hora de Bogotá.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import { BandaAlmuerzo, NavegadorFecha } from '@/components/PartesAgenda';
import ResumenDiasLaborables from '@/components/ResumenDiasLaborables';
import TarjetaCitaAgenda from '@/components/TarjetaCitaAgenda';
import { useAgenda, useAhora } from '@/hooks/useAgenda';
import { useAsistencia } from '@/hooks/useAsistencia';
import { useDiasEspeciales } from '@/hooks/useDiasTrabajo';
import { useProfesionales } from '@/hooks/useProfesionales';
import { filasDelDia } from '@/lib/agenda';
import { festivosDelRango, horarioVigente, textoVentana } from '@/lib/diasTrabajo';
import { aBogota, sumarDias } from '@/lib/disponibilidad';
import { mensajeDeError } from '@/lib/errores';
import { etiquetaDia, mayuscula } from '@/lib/fechas';

/** Chip "Todos": sin filtro de profesional. */
const TODOS = 'todos';

export default function AgendaLocal() {
  const ahora = useAhora();
  const hoy = aBogota(new Date(ahora)).fecha;
  const [fecha, setFecha] = useState(() => aBogota(new Date()).fecha);
  const [filtro, setFiltro] = useState(TODOS);

  // Una sola consulta con las citas de todos; el chip filtra en el teléfono.
  const agenda = useAgenda({ desde: fecha, hasta: sumarDias(fecha, 1) });
  const profesionales = useProfesionales();
  const { data: especiales } = useDiasEspeciales(fecha, fecha);
  const { propsTarjeta } = useAsistencia();

  const citas = useMemo(
    () => (agenda.data ?? []).filter((c) => filtro === TODOS || c.profesionalId === filtro),
    [agenda.data, filtro],
  );

  // La jornada solo se muestra cuando se sabe si el día tiene una excepción.
  const jornada = especiales
    ? textoVentana(
        horarioVigente(
          fecha,
          new Set(festivosDelRango(fecha, fecha).keys()),
          especiales.find((d) => d.fecha === fecha),
        ),
      )
    : null;
  const festivo = festivosDelRango(fecha, fecha).get(fecha);
  const nombreFiltro = profesionales.data?.find((p) => p.id === filtro)?.nombre;

  return (
    <ScrollView
      className="flex-1 bg-fondo"
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={agenda.isRefetching} onRefresh={() => void agenda.refetch()} />
      }
    >
      <View className="border-b border-borde px-4 pb-2 pt-4">
        <Text className="font-titulo text-2xl text-primary">El local, en orden.</Text>
        <Text className="font-texto text-base text-secondary">
          {mayuscula(etiquetaDia(fecha).largo)}
          {fecha === hoy ? ' · Hoy' : ''}
          {festivo ? ` · ${festivo}` : ''}
          {jornada ? ` · ${jornada === 'Cerrado' ? 'Cerrado' : `Jornada ${jornada}`}` : ''}
        </Text>

        <View className="mt-3 flex-row flex-wrap">
          <Chip etiqueta="Todos" activo={filtro === TODOS} onPress={() => setFiltro(TODOS)} />
          {(profesionales.data ?? []).map((p) => (
            <Chip key={p.id} etiqueta={p.nombre} activo={filtro === p.id} onPress={() => setFiltro(p.id)} />
          ))}
          {fecha === hoy ? null : <Chip etiqueta="Hoy" activo={false} onPress={() => setFecha(hoy)} />}
        </View>
        {profesionales.isError ? (
          <Text className="font-texto text-sm text-secondary">
            No pudimos cargar los profesionales para filtrar.{' '}
            <Text className="underline" onPress={() => void profesionales.refetch()}>
              Reintentar
            </Text>
          </Text>
        ) : null}

        <NavegadorFecha
          titulo={mayuscula(etiquetaDia(fecha).largo)}
          onAnterior={() => setFecha((f) => sumarDias(f, -1))}
          onSiguiente={() => setFecha((f) => sumarDias(f, 1))}
        />
      </View>

      <View className="min-h-48 p-4">
        {agenda.isPending ? (
          <EstadoPantalla tipo="carga" mensaje="Cargando la agenda del local…" />
        ) : agenda.isError ? (
          <EstadoPantalla
            tipo="error"
            mensaje={mensajeDeError(agenda.error)}
            onReintentar={() => void agenda.refetch()}
          />
        ) : citas.length === 0 ? (
          <EstadoPantalla
            tipo="vacio"
            icono="calendar-clear-outline"
            mensaje={
              nombreFiltro ? `${nombreFiltro} no tiene citas este día.` : 'No hay citas este día.'
            }
          />
        ) : (
          filasDelDia(citas).map((fila) =>
            fila.tipo === 'cita' ? (
              <TarjetaCitaAgenda
                key={fila.cita.id}
                cita={fila.cita}
                ahoraMs={ahora}
                mostrarProfesional
                {...propsTarjeta(fila.cita)}
              />
            ) : (
              <BandaAlmuerzo key="almuerzo" />
            ),
          )
        )}
      </View>

      <View className="px-4">
        <ResumenDiasLaborables hoy={hoy} />
        <Boton variante="borde" className="mt-3" onPress={() => router.push('/panel/bloqueos')}>
          Bloqueos
        </Boton>
      </View>
    </ScrollView>
  );
}
