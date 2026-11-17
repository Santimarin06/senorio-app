// Mi agenda del profesional (RF-21, RF-23, mockup "Buen día, Mario"): sus citas del día o de
// la semana, en hora de Bogotá, con la banda del almuerzo y los botones de asistencia.
// Solo las suyas: la RLS lo garantiza y la consulta filtra por su ficha de profesional.
import { Ionicons } from '@expo/vector-icons';
import { Fragment, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import TarjetaCitaAgenda from '@/components/TarjetaCitaAgenda';
import { DISPONIBILIDAD, NEGOCIO } from '@/config/negocio';
import { useAgenda, useAhora, useMarcarAsistencia } from '@/hooks/useAgenda';
import {
  citasPorDia,
  fechasDelRango,
  filasDelDia,
  moverFecha,
  rangoAgenda,
  type VistaAgenda,
} from '@/lib/agenda';
import { aBogota, sumarDias } from '@/lib/disponibilidad';
import { mensajeDeAsistencia, mensajeDeError } from '@/lib/errores';
import { etiquetaDia, formatoHora } from '@/lib/fechas';
import { formatoCOP } from '@/lib/finanzas';
import { useSesionStore } from '@/store/useSesionStore';
import type { CitaAgenda, MarcaAsistencia } from '@/types/entidades';

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
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
  const marcar = useMarcarAsistencia();

  const guardar = (citaId: string, estado: MarcaAsistencia) =>
    // Sin actualización optimista: la pantalla cambia cuando la base confirma y se recarga.
    marcar.mutate(
      { citaId, estado },
      { onError: (e) => Alert.alert('No se guardó', mensajeDeAsistencia(e)) },
    );

  const onMarcar = (cita: CitaAgenda, estado: MarcaAsistencia) => {
    if (estado === 'asistida') return guardar(cita.id, estado);
    Alert.alert(
      '¿Marcar como no asistida?',
      `${cita.cliente.nombre} no llegó. Se genera la multa de ${formatoCOP(NEGOCIO.multa)}; si tiene anticipo aprobado, se descuenta de él.`,
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'No asistió', style: 'destructive', onPress: () => guardar(cita.id, estado) },
      ],
    );
  };

  const tarjeta = (cita: CitaAgenda) => (
    <TarjetaCitaAgenda
      key={cita.id}
      cita={cita}
      ahoraMs={ahora}
      onMarcar={(estado) => onMarcar(cita, estado)}
      guardando={marcar.isPending && marcar.variables.citaId === cita.id ? marcar.variables.estado : null}
      bloqueada={marcar.isPending}
    />
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
        <EstadoPantalla tipo="error" mensaje={mensajeDeError(error)} onReintentar={refetch} />
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

/** Almuerzo de 12:00 a 13:00: nunca hay citas (RN-01). */
function BandaAlmuerzo() {
  const { inicioMin, finMin } = DISPONIBILIDAD.ALMUERZO;
  return (
    <View className="mb-3 rounded-xl bg-borde px-4 py-3">
      <Text className="text-center font-texto text-base text-secondary">
        {formatoHora(inicioMin)} – {formatoHora(finMin)} · Almuerzo · Sin citas
      </Text>
    </View>
  );
}

function BotonFlecha({
  icono,
  etiqueta,
  onPress,
}: {
  icono: 'chevron-back' | 'chevron-forward';
  etiqueta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={8}
      className="h-12 w-12 items-center justify-center active:opacity-60"
    >
      <Ionicons name={icono} size={24} color="#111111" />
    </Pressable>
  );
}
