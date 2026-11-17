// Mi agenda del profesional (RF-21, RF-23, mockup "Buen día, Mario"): sus citas del día o de
// la semana, en hora de Bogotá, con la banda del almuerzo y los botones de asistencia.
// Solo las suyas: la RLS lo garantiza y la consulta filtra por su ficha de profesional.
import { Fragment, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import { BandaAlmuerzo, BotonFlecha } from '@/components/PartesAgenda';
import TarjetaCitaAgenda from '@/components/TarjetaCitaAgenda';
import { useAgenda, useAhora } from '@/hooks/useAgenda';
import { useAsistencia } from '@/hooks/useAsistencia';
import {
  citasPorDia,
  fechasDelRango,
  filasDelDia,
  moverFecha,
  rangoAgenda,
  type VistaAgenda,
} from '@/lib/agenda';
import { aBogota, sumarDias } from '@/lib/disponibilidad';
import { etiquetaDia, mayuscula } from '@/lib/fechas';
import { useSesionStore } from '@/store/useSesionStore';
import type { CitaAgenda } from '@/types/entidades';

const hoyEnBogota = () => aBogota(new Date()).fecha;

export default function MiAgenda() {
  const usuario = useSesionStore((s) => s.usuario);

  // El perfil de un profesional siempre tiene ficha (restricción de la tabla perfiles).
  if (!usuario?.profesionalId) {
    return (
      <EstadoPantalla
        tipo="vacio"
        icono="person-circle-outline"
        mensaje="Tu cuenta aún no tiene una ficha de profesional. Pídele al administrador que la asigne."
      />
    );
  }
  return <AgendaProfesional profesionalId={usuario.profesionalId} nombre={usuario.nombre} />;
}

function AgendaProfesional({ profesionalId, nombre }: { profesionalId: string; nombre: string }) {
  const ahora = useAhora();
  const hoy = aBogota(new Date(ahora)).fecha;
  const [vista, setVista] = useState<VistaAgenda>('dia');
  const [fecha, setFecha] = useState(hoyEnBogota);
  const rango = useMemo(() => rangoAgenda(vista, fecha), [vista, fecha]);

  const { data, isPending, isError, error, refetch, isRefetching } = useAgenda({
    ...rango,
    profesionalId,
  });
  const { propsTarjeta } = useAsistencia();

  const tarjeta = (cita: CitaAgenda) => (
    <TarjetaCitaAgenda key={cita.id} cita={cita} ahoraMs={ahora} {...propsTarjeta(cita)} />
  );

  const filas = (citas: readonly CitaAgenda[]) =>
    filasDelDia(citas).map((fila) =>
      fila.tipo === 'cita' ? tarjeta(fila.cita) : <BandaAlmuerzo key="almuerzo" />,
    );

  const ultimoDia = sumarDias(rango.hasta, -1);
  const titulo =
    vista === 'dia'
      ? `${mayuscula(etiquetaDia(fecha).largo)}${fecha === hoy ? ' · Hoy' : ''}`
      : `Del ${etiquetaDia(rango.desde).largo} al ${etiquetaDia(ultimoDia).largo}`;
  const enHoy = hoy >= rango.desde && hoy < rango.hasta;

  const vacio =
    vista === 'semana'
      ? 'No tienes citas esta semana.'
      : fecha === hoy
        ? 'Hoy no tienes citas.'
        : 'No tienes citas este día.';

  return (
    <View className="flex-1 bg-fondo">
      <View className="border-b border-borde px-4 pb-2 pt-4">
        <Text className="font-titulo text-2xl text-primary">Buen día, {nombre}.</Text>
        <Text className="font-texto text-base text-secondary">
          {mayuscula(etiquetaDia(hoy).largo)} · Solo tu agenda · Hora de Bogotá
        </Text>

        <View className="mt-3 flex-row">
          <Chip etiqueta="Día" activo={vista === 'dia'} onPress={() => setVista('dia')} />
          <Chip etiqueta="Semana" activo={vista === 'semana'} onPress={() => setVista('semana')} />
          {enHoy ? null : <Chip etiqueta="Hoy" activo={false} onPress={() => setFecha(hoy)} />}
        </View>

        <View className="flex-row items-center justify-between">
          <BotonFlecha
            icono="chevron-back"
            etiqueta={vista === 'dia' ? 'Día anterior' : 'Semana anterior'}
            onPress={() => setFecha((f) => moverFecha(vista, f, -1))}
          />
          <Text className="flex-1 text-center font-texto text-base text-primary">{titulo}</Text>
          <BotonFlecha
            icono="chevron-forward"
            etiqueta={vista === 'dia' ? 'Día siguiente' : 'Semana siguiente'}
            onPress={() => setFecha((f) => moverFecha(vista, f, 1))}
          />
        </View>
      </View>

      {isPending ? (
        <EstadoPantalla tipo="carga" mensaje="Cargando tu agenda…" />
      ) : isError ? (
        <EstadoPantalla tipo="error" error={error} onReintentar={refetch} />
      ) : data.length === 0 ? (
        <EstadoPantalla tipo="vacio" icono="calendar-clear-outline" mensaje={vacio} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        >
          {vista === 'dia'
            ? filas(data)
            : citasPorDia(data, fechasDelRango(rango))
                .filter((dia) => dia.citas.length > 0)
                .map((dia) => (
                  <Fragment key={dia.fecha}>
                    <Text className="mb-2 mt-2 font-texto text-lg text-primary">
                      {mayuscula(etiquetaDia(dia.fecha).largo)}
                      {dia.fecha === hoy ? ' · Hoy' : ''}
                    </Text>
                    {filas(dia.citas)}
                  </Fragment>
                ))}
        </ScrollView>
      )}
    </View>
  );
}
