// Tarjeta "Días laborables" de la agenda del local (RF-24, RN-10, mockup): el próximo domingo
// o festivo, si está cerrado o habilitado, el botón para habilitarlo y el horario normal.
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import Boton from '@/components/Boton';
import { DIAS_TRABAJO } from '@/config/negocio';
import { useDiasEspeciales } from '@/hooks/useDiasTrabajo';
import { useHabilitarDia } from '@/hooks/useHabilitarDia';
import { domingosYFestivos, textoVentana, TEXTO_HORARIO_NORMAL } from '@/lib/diasTrabajo';
import { CONFIG, sumarDias } from '@/lib/disponibilidad';
import { diaYNumero, etiquetaDia, mayuscula } from '@/lib/fechas';

export default function ResumenDiasLaborables({ hoy }: { hoy: string }) {
  const hasta = sumarDias(hoy, DIAS_TRABAJO.diasExcepciones);
  const { data, isPending, isError, refetch } = useDiasEspeciales(hoy, hasta);
  const { habilitar, habilitando } = useHabilitarDia();
  const proximo = domingosYFestivos(hoy, DIAS_TRABAJO.diasDomingosFestivos)[0];
  const especial = proximo ? data?.find((d) => d.fecha === proximo.fecha) : undefined;
  const porDefecto = textoVentana(CONFIG.HABILITADO);

  const dia = proximo ? etiquetaDia(proximo.fecha) : null;

  return (
    <View className="rounded-xl border border-borde p-4">
      <Text className="font-titulo text-lg text-primary">Días laborables</Text>

      {proximo && dia ? (
        <View className="mt-2">
          <Text className="font-texto text-base text-primary">
            {mayuscula(dia.largo)}
            {proximo.festivo ? ` · ${proximo.festivo}` : ''}
          </Text>
          {isPending ? (
            <Text className="font-texto text-sm text-secondary">Revisando si está habilitado…</Text>
          ) : isError ? (
            <Text className="font-texto text-sm text-secondary">
              No pudimos revisar este día.{' '}
              <Text className="underline" onPress={() => void refetch()}>
                Reintentar
              </Text>
            </Text>
          ) : especial ? (
            <Text className="font-texto text-sm text-secondary">
              {especial.abierto ? `Habilitado · ${textoVentana(especial)}` : 'Cerrado por el administrador'}
            </Text>
          ) : (
            <>
              <Text className="font-texto text-sm text-secondary">
                Cerrado por defecto. Puedes habilitar una jornada de {porDefecto}.
              </Text>
              <Boton
                className="mt-2"
                onPress={() => habilitar(proximo.fecha)}
                cargando={habilitando === proximo.fecha}
                disabled={habilitando !== null}
              >
                {`Habilitar ${diaYNumero(proximo.fecha)} · ${porDefecto}`}
              </Boton>
            </>
          )}
        </View>
      ) : null}

      <Text className="mt-3 font-texto text-sm text-secondary">{TEXTO_HORARIO_NORMAL}</Text>
      <Boton variante="borde" className="mt-3" onPress={() => router.push('/panel/dias')}>
        Ver domingos, festivos y horarios
      </Boton>
    </View>
  );
}
