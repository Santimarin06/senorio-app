// Cuerpo de "Antes de cancelar" (RF-09, RF-07, RN-06, RN-07, RN-15). Antes de confirmar
// muestra la consecuencia calculada con src/lib/finanzas.ts; al confirmar, la base decide con
// cancelar_cita y la pantalla muestra lo que la base guardó, aunque difiera del cálculo previo
// (por ejemplo, si se cruzó el límite de 4 horas mientras el cliente decidía).
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import PantallaPendiente from '@/components/PantallaPendiente';
import { NEGOCIO } from '@/config/negocio';
import { useCancelarCita } from '@/hooks/useCita';
import { horasHasta, limiteSinMulta, puedeCancelar, textoTiempoRestante } from '@/lib/cancelacion';
import { codigoCita } from '@/lib/codigoCita';
import { mensajeDeCancelacion } from '@/lib/errores';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import {
  calcularCancelacion,
  consecuenciaCancelacion,
  formatoCOP,
  type ResultadoCancelacion,
} from '@/lib/finanzas';
import { enlaceWhatsApp, mensajeCancelacion } from '@/lib/whatsapp';
import { ETIQUETA_ESTADO } from '@/models/cita.mapper';
import { useSesionStore } from '@/store/useSesionStore';
import type { Cita, ResultadoCancelacionBase } from '@/types/entidades';

/** Cada cuánto se recalcula el tiempo que falta, para notar el cruce de las 4 horas. */
const REFRESCO_MS = 30_000;

export default function CancelarCita({ cita }: { cita: Cita }) {
  const cancelar = useCancelarCita();
  const [ahora, setAhora] = useState(() => Date.now());
  // Lo que la pantalla mostraba al pulsar "Sí, cancelar", para avisar si la base decidió otra cosa.
  const [tardiaMostrada, setTardiaMostrada] = useState<boolean | null>(null);

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, []);

  // 1. La base confirmó la cancelación: solo aquí se muestra como cancelada (RN-12, RN-14).
  if (cancelar.data) {
    return <CancelacionHecha cita={cita} resultado={cancelar.data} tardiaMostrada={tardiaMostrada} />;
  }

  // 2. La cita ya cambió de estado o ya empezó (estado de guarda).
  if (!puedeCancelar(cita, ahora)) {
    return (
      <PantallaPendiente
        icono="calendar-clear-outline"
        mensaje={`Esta cita ya no se puede cancelar. Estado: ${ETIQUETA_ESTADO[cita.estado]}.`}
        acciones={[
          {
            texto: 'Volver a la cita',
            onPress: () => router.navigate({ pathname: '/cita/[id]', params: { id: cita.id } }),
          },
        ]}
      />
    );
  }

  // 3. Antes de cancelar: consecuencia calculada con la hora actual.
  const horas = horasHasta(cita.inicio, ahora);
  const consecuencia = calcularCancelacion({
    anticipoAprobado: cita.anticipoAprobado,
    horasAntes: horas,
    reagenda: false,
  });
  const tardia = consecuencia.multa > 0;

  const confirmar = () => {
    setTardiaMostrada(tardia);
    cancelar.mutate(cita.id);
  };

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      <Text className="font-texto text-sm text-secondary">CITA {codigoCita(cita.id)}</Text>
      <Text className="font-titulo text-2xl text-primary">Antes de cancelar</Text>
      <Text className="mt-2 font-texto text-base text-primary">
        {cita.profesional} · {formatoFechaHoraBogota(cita.inicio)}
      </Text>
      <Text className="font-texto text-base text-secondary">
        {cita.servicios.map((s) => s.nombre).join(', ')}. Total {formatoCOP(cita.total)} · Anticipo
        aprobado: {formatoCOP(cita.anticipoAprobado)}.
      </Text>

      <View className="mt-6 rounded-xl border border-borde p-4">
        <Text className="font-titulo text-lg text-primary">{textoTiempoRestante(horas)} para tu cita</Text>
        <Text className="mt-1 font-texto text-sm text-secondary">
          {tardia
            ? `Al faltar menos de ${NEGOCIO.horasMinimasCancelarSinMulta} horas, aplica una multa de ${formatoCOP(NEGOCIO.multa)}.`
            : `Cancela hasta el ${formatoFechaHoraBogota(limiteSinMulta(cita.inicio))} sin multa.`}{' '}
          Hora de Bogotá.
        </Text>
      </View>

      <DesgloseDevolucion anticipo={cita.anticipoAprobado} consecuencia={consecuencia} />

      <Text className="mb-4 font-texto text-sm text-secondary">
        Este cálculo corresponde a cancelar sin reagendar. La devolución se gestiona el mismo día.
      </Text>

      <Boton className="mb-3" cargando={cancelar.isPending} onPress={confirmar}>
        Sí, cancelar la cita
      </Boton>
      <Boton variante="borde" className="mb-3" disabled={cancelar.isPending} onPress={() => router.back()}>
        Conservar mi cita
      </Boton>

      {cancelar.isError ? (
        <Text className="mb-3 font-texto text-sm text-peligro">{mensajeDeCancelacion(cancelar.error)}</Text>
      ) : null}

      <Text className="font-texto text-sm text-secondary">
        Después podrás abrir el aviso de cancelación en WhatsApp y enviarlo manualmente.
      </Text>
    </ScrollView>
  );
}

/** Tarjeta "Así queda la devolución" del mockup. */
function DesgloseDevolucion({
  anticipo,
  consecuencia,
}: {
  anticipo: number;
  consecuencia: ResultadoCancelacion;
}) {
  return (
    <View className="my-6 rounded-xl border border-borde p-4">
      <Text className="mb-2 font-titulo text-base text-primary">Así queda la devolución</Text>
      <Fila texto="Anticipo aprobado" valor={formatoCOP(anticipo)} />
      {consecuencia.multa > 0 ? (
        <Fila texto="Multa por cancelación tardía" valor={`− ${formatoCOP(consecuencia.multaCubierta)}`} />
      ) : null}
      {consecuencia.costoDevolucion > 0 ? (
        <Fila texto="Costo de devolución" valor={`− ${formatoCOP(consecuencia.costoDevolucion)}`} />
      ) : null}
      <View className="mt-3 flex-row justify-between border-t border-borde pt-3">
        <Text className="font-titulo text-base text-primary">Recibirás</Text>
        <Text className="font-titulo text-base text-primary">{formatoCOP(consecuencia.devolucion)}</Text>
      </View>
      {consecuencia.multa > 0 ? (
        <Text
          className={`mt-3 font-texto text-sm ${consecuencia.multaPendiente > 0 ? 'text-peligro' : 'text-secondary'}`}
        >
          {consecuencia.multaPendiente > 0
            ? `Queda una multa pendiente de ${formatoCOP(consecuencia.multaPendiente)}. Hasta pagarla no podrás reservar ni enviar anticipos.`
            : 'La multa queda cubierta con tu anticipo. No queda una multa pendiente.'}
        </Text>
      ) : null}
    </View>
  );
}

function Fila({ texto, valor }: { texto: string; valor: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="font-texto text-base text-secondary">{texto}</Text>
      <Text className="font-texto text-base text-secondary">{valor}</Text>
    </View>
  );
}

/** Vista después de que la base confirmó la cancelación. */
function CancelacionHecha({
  cita,
  resultado,
  tardiaMostrada,
}: {
  cita: Cita;
  resultado: ResultadoCancelacionBase;
  tardiaMostrada: boolean | null;
}) {
  const cliente = useSesionStore((s) => s.usuario?.nombre ?? '');
  const [errorWhatsApp, setErrorWhatsApp] = useState(false);
  const tardia = resultado.estado === 'cancelada_tarde';
  // Mismo cálculo de la pantalla, pero con lo que guardó la base (estado y anticipo aprobado).
  const consecuencia = consecuenciaCancelacion({
    anticipoAprobado: resultado.anticipoAprobado,
    tardia,
    reagenda: false,
  });
  const multaPendiente = resultado.multaEstado === 'pendiente' ? consecuencia.multa : 0;
  const cambio = tardiaMostrada !== null && tardiaMostrada !== tardia;

  const avisar = async () => {
    setErrorWhatsApp(false);
    const enlace = enlaceWhatsApp(
      mensajeCancelacion({
        cliente,
        codigo: codigoCita(cita.id),
        profesional: cita.profesional,
        servicios: cita.servicios.map((s) => s.nombre),
        fechaHora: formatoFechaHoraBogota(cita.inicio),
        total: cita.total,
        tardia,
        devolucion: consecuencia.devolucion,
        multaPendiente,
      }),
    );
    try {
      await Linking.openURL(enlace);
    } catch {
      setErrorWhatsApp(true);
    }
  };

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      <View className="mb-6 items-center">
        <Ionicons name="checkmark-circle" size={56} color="#111111" />
        <Text className="mt-2 font-titulo text-2xl text-primary">Cita cancelada</Text>
        <Text className="text-center font-texto text-base text-secondary">
          {codigoCita(cita.id)} · {cita.profesional} · {formatoFechaHoraBogota(cita.inicio)}
        </Text>
        <Text className="mt-1 font-texto text-base text-primary">{ETIQUETA_ESTADO[resultado.estado]}</Text>
      </View>

      {cambio ? (
        <Text className="mb-3 font-texto text-sm text-peligro">
          {tardia
            ? `Al confirmar ya faltaban menos de ${NEGOCIO.horasMinimasCancelarSinMulta} horas: la cancelación quedó como tardía.`
            : `Al confirmar faltaban ${NEGOCIO.horasMinimasCancelarSinMulta} horas o más: la cancelación quedó sin multa.`}
        </Text>
      ) : null}

      <View className="mb-6 rounded-xl border border-borde p-4">
        <Fila texto="Anticipo aprobado" valor={formatoCOP(resultado.anticipoAprobado)} />
        {consecuencia.multa > 0 ? (
          <Fila texto="Multa por cancelación tardía" valor={formatoCOP(consecuencia.multa)} />
        ) : null}
        {consecuencia.costoDevolucion > 0 ? (
          <Fila texto="Costo de devolución" valor={`− ${formatoCOP(consecuencia.costoDevolucion)}`} />
        ) : null}
        <View className="mt-3 flex-row justify-between border-t border-borde pt-3">
          <Text className="font-titulo text-base text-primary">Recibirás</Text>
          <Text className="font-titulo text-base text-primary">{formatoCOP(consecuencia.devolucion)}</Text>
        </View>
        {multaPendiente > 0 ? (
          <Text className="mt-3 font-texto text-sm text-peligro">
            Tienes una multa pendiente de {formatoCOP(multaPendiente)}. Hasta pagarla o que el local la
            perdone no podrás reservar ni enviar anticipos.
          </Text>
        ) : consecuencia.multa > 0 ? (
          <Text className="mt-3 font-texto text-sm text-secondary">
            La multa quedó cubierta con tu anticipo.
          </Text>
        ) : null}
      </View>

      <Text className="mb-3 font-texto text-sm text-secondary">
        Avísale al local por WhatsApp: el mensaje ya va escrito, solo pulsas enviar.
      </Text>
      <Boton className="mb-3" onPress={avisar}>
        Abrir WhatsApp con el aviso de cancelación
      </Boton>
      {errorWhatsApp ? (
        <Text className="mb-3 font-texto text-sm text-peligro">
          No pudimos abrir WhatsApp. Tu cita sigue cancelada.
        </Text>
      ) : null}
      <Boton variante="borde" onPress={() => router.navigate('/citas')}>
        Ver mis citas
      </Boton>
    </ScrollView>
  );
}
