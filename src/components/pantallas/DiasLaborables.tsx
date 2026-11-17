// Días laborables (RF-24, RN-10, D-09): los próximos domingos y festivos, con el nombre del
// festivo, para habilitarlos (10:00 a 16:00 por defecto) o cambiar su horario; las demás
// excepciones de horario; y el acceso al horario especial de cualquier día.
import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import { DIAS_TRABAJO } from '@/config/negocio';
import { useAhora } from '@/hooks/useAgenda';
import { useDiasEspeciales } from '@/hooks/useDiasTrabajo';
import { useHabilitarDia } from '@/hooks/useHabilitarDia';
import { domingosYFestivos, TEXTO_HORARIO_NORMAL, textoVentana } from '@/lib/diasTrabajo';
import { aBogota, CONFIG, sumarDias } from '@/lib/disponibilidad';
import { mensajeDeError } from '@/lib/errores';
import { etiquetaDia, mayuscula } from '@/lib/fechas';
import type { DiaEspecial } from '@/types/entidades';

const textoExcepcion = (dia: DiaEspecial) =>
  dia.abierto ? `Horario especial · ${textoVentana(dia)}` : 'Cerrado por el administrador';

const editar = (fecha: string) => router.push({ pathname: '/panel/horario-dia', params: { fecha } });

export default function DiasLaborables() {
  const hoy = aBogota(new Date(useAhora())).fecha;
  const hasta = sumarDias(hoy, DIAS_TRABAJO.diasExcepciones);
  const { data, isPending, isError, error, refetch, isRefetching } = useDiasEspeciales(hoy, hasta);
  const { habilitar, habilitando } = useHabilitarDia();

  const cerradosPorDefecto = useMemo(
    () => domingosYFestivos(hoy, DIAS_TRABAJO.diasDomingosFestivos),
    [hoy],
  );

  if (isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando los días laborables…" />;
  if (isError) {
    return <EstadoPantalla tipo="error" mensaje={mensajeDeError(error)} onReintentar={refetch} />;
  }

  const porFecha = new Map(data.map((d) => [d.fecha, d]));
  const fechasDomingoFestivo = new Set(cerradosPorDefecto.map((d) => d.fecha));
  // Excepciones en días normales, o en domingos y festivos más allá de los que se listan arriba.
  const otras = data.filter((d) => !fechasDomingoFestivo.has(d.fecha));
  const porDefecto = textoVentana(CONFIG.HABILITADO);

  return (
    <ScrollView
      className="flex-1 bg-fondo"
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      <Text className="font-texto text-base text-secondary">{TEXTO_HORARIO_NORMAL}</Text>
      <Boton className="mt-3" onPress={() => router.push('/panel/horario-dia')}>
        Horario especial para otro día
      </Boton>

      <Text className="mb-2 mt-6 font-titulo text-lg text-primary">
        Domingos y festivos de los próximos {DIAS_TRABAJO.diasDomingosFestivos} días
      </Text>
      {cerradosPorDefecto.map(({ fecha, festivo }) => {
        const especial = porFecha.get(fecha);
        return (
          <View key={fecha} className="mb-3 rounded-xl border border-borde p-4">
            <Text className="font-texto text-base text-primary">
              {mayuscula(etiquetaDia(fecha).largo)}
            </Text>
            <Text className="font-texto text-sm text-secondary">
              {festivo ?? 'Domingo'} ·{' '}
              {especial
                ? especial.abierto
                  ? `Habilitado · ${textoVentana(especial)}`
                  : 'Cerrado por el administrador'
                : 'Cerrado por defecto'}
            </Text>
            {especial?.nota ? (
              <Text className="font-texto text-sm text-secondary">Nota: {especial.nota}</Text>
            ) : null}
            <View className="mt-3 flex-row gap-3">
              {especial ? (
                <Boton className="flex-1" variante="borde" onPress={() => editar(fecha)}>
                  Editar o quitar
                </Boton>
              ) : (
                <>
                  <Boton
                    className="flex-1"
                    onPress={() => habilitar(fecha)}
                    cargando={habilitando === fecha}
                    disabled={habilitando !== null}
                  >
                    {`Habilitar ${porDefecto}`}
                  </Boton>
                  <Boton className="flex-1" variante="borde" onPress={() => editar(fecha)}>
                    Otro horario
                  </Boton>
                </>
              )}
            </View>
          </View>
        );
      })}

      <Text className="mb-2 mt-6 font-titulo text-lg text-primary">Otras excepciones</Text>
      {otras.length === 0 ? (
        <Text className="font-texto text-base text-secondary">
          No hay otros días con horario especial ni cerrados.
        </Text>
      ) : (
        otras.map((dia) => (
          <View key={dia.fecha} className="mb-3 rounded-xl border border-borde p-4">
            <Text className="font-texto text-base text-primary">
              {mayuscula(etiquetaDia(dia.fecha).largo)}
            </Text>
            <Text className="font-texto text-sm text-secondary">{textoExcepcion(dia)}</Text>
            {dia.nota ? (
              <Text className="font-texto text-sm text-secondary">Nota: {dia.nota}</Text>
            ) : null}
            <Boton className="mt-3" variante="borde" onPress={() => editar(dia.fecha)}>
              Editar o quitar
            </Boton>
          </View>
        ))
      )}
    </ScrollView>
  );
}
