// Cuerpo de "Cambiamos el momento" (RF-14, RN-15, RN-16, D-05, D-26, D-45). El cliente elige
// otra franja del mismo profesional con los mismos servicios. Qué anticipo pasa lo calcula
// src/lib/reagendar.ts; al confirmar, la base decide con reagendar_cita y la pantalla muestra
// lo que guardó. La franja actual se libera solo cuando la base confirma el cambio.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';

import AvisoEscritura from '@/components/AvisoEscritura';
import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import PantallaPendiente from '@/components/PantallaPendiente';
import SelectorSemana, { type SeleccionFranja } from '@/components/SelectorSemana';
import { NEGOCIO } from '@/config/negocio';
import { useCita, useMultaPendiente, useReagendarCita } from '@/hooks/useCita';
import { useDisponibilidadSemanal } from '@/hooks/useDisponibilidadSemanal';
import { horasHasta, textoTiempoRestante } from '@/lib/cancelacion';
import { codigoCita } from '@/lib/codigoCita';
import { aBogota, franjaLibre, instanteDeFranja, lunesDe } from '@/lib/disponibilidad';
import { esFranjaTomada, mensajeDeError, mensajeDeReagendar } from '@/lib/errores';
import { etiquetaDia, formatoFechaHoraBogota, formatoHora } from '@/lib/fechas';
import { calcularSaldo, formatoCOP } from '@/lib/finanzas';
import { opcionReagendar } from '@/lib/reagendar';
import { enlaceWhatsApp, mensajeReagendamiento } from '@/lib/whatsapp';
import { useSesionStore } from '@/store/useSesionStore';
import type { Cita, ResultadoReagendar } from '@/types/entidades';

/** Cada cuánto se recalcula el tiempo que falta, para notar el cruce de las 4 horas. */
const REFRESCO_MS = 30_000;

export default function ReagendarCita({ cita }: { cita: Cita }) {
  const multa = useMultaPendiente();
  const reagendar = useReagendarCita();
  const [ahora, setAhora] = useState(() => Date.now());

  const lunesActual = lunesDe(aBogota(new Date(ahora)).fecha);
  const [lunes, setLunes] = useState(lunesActual);
  const [seleccion, setSeleccion] = useState<SeleccionFranja | null>(null);
  const duracionMin = Math.round((Date.parse(cita.fin) - Date.parse(cita.inicio)) / 60_000);
  // La franja actual no cuenta como ocupada: se puede mover, por ejemplo, 15 minutos.
  const disponibilidad = useDisponibilidadSemanal(cita.profesionalId, duracionMin, lunes, {
    inicio: cita.inicio,
    fin: cita.fin,
  });

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, []);

  const volver = () => router.navigate({ pathname: '/cita/[id]', params: { id: cita.id } });

  // 1. La base confirmó el cambio: solo aquí se muestra como reagendada (RN-12, RN-14).
  if (reagendar.data) {
    return <ReagendamientoHecho cita={cita} resultado={reagendar.data} />;
  }

  if (multa.isPending) return <EstadoPantalla tipo="carga" mensaje="Revisando tu cita…" />;
  if (multa.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        error={multa.error}
        onReintentar={() => void multa.refetch()}
      />
    );
  }

  // 2. Guarda: la cita no se puede reagendar (menos de 4 h, plazo vencido, multa…).
  const opcion = opcionReagendar(cita, ahora, multa.data);
  if (!opcion.puede) {
    const porMulta = multa.data > 0;
    return (
      <PantallaPendiente
        icono="calendar-clear-outline"
        mensaje={opcion.motivo}
        acciones={[
          ...(porMulta ? [{ texto: 'Ver mi multa', onPress: () => router.navigate('/cuenta') }] : []),
          { texto: 'Volver a la cita', onPress: volver },
        ]}
      />
    );
  }

  const seleccionLibre =
    seleccion !== null && franjaLibre(disponibilidad.dias, seleccion.fecha, seleccion.inicioMin);
  const nuevoInicio = seleccion ? instanteDeFranja(seleccion.fecha, seleccion.inicioMin) : null;
  const esMismoHorario = nuevoInicio !== null && Date.parse(nuevoInicio) === Date.parse(cita.inicio);
  const ocupado = reagendar.isPending;
  const saldo = calcularSaldo(cita.total, opcion.trasladado + opcion.diferencia);

  const confirmar = () => {
    if (!seleccion || !seleccionLibre || !nuevoInicio || esMismoHorario) return;
    Alert.alert(
      'Confirmar cambio de horario',
      `Tu cita pasa al ${etiquetaDia(seleccion.fecha).largo}, ${formatoHora(seleccion.inicioMin)}. La franja actual se libera.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cambiar',
          onPress: () =>
            reagendar.mutate(
              { id: cita.id, inicio: nuevoInicio },
              {
                // Si otro cliente tomó la franja, se borra la elección para que escoja otra.
                onError: (error) => {
                  if (esFranjaTomada(error)) setSeleccion(null);
                },
              },
            ),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-fondo">
      <View className="px-4 pt-4">
        <Text className="font-texto text-sm text-secondary">CITA {codigoCita(cita.id)}</Text>
        <Text className="font-titulo text-2xl text-primary">Cambiamos el momento.</Text>
        <Text className="font-texto text-base text-secondary">
          {cita.profesional} · Mismos servicios · {duracionMin} min
        </Text>
        <View className="mt-3 rounded-xl border border-borde p-3">
          <Text className="font-texto text-xs text-secondary">
            {opcion.caso === 'no_asistida' ? 'CITA A LA QUE NO ASISTISTE' : 'HORARIO ACTUAL'}
          </Text>
          <Text className="font-texto text-base text-primary">{formatoFechaHoraBogota(cita.inicio)}</Text>
          {opcion.caso === 'futura' ? (
            <Text className="font-texto text-sm text-secondary">
              {textoTiempoRestante(horasHasta(cita.inicio, ahora))} para la cita original.
            </Text>
          ) : (
            <Text className="font-texto text-sm text-secondary">
              Puedes reagendarla hasta el {etiquetaDia(opcion.hasta).largo}.
            </Text>
          )}
        </View>
      </View>

      <SelectorSemana
        lunes={lunes}
        lunesActual={lunesActual}
        onCambiarLunes={setLunes}
        disponibilidad={disponibilidad}
        profesional={cita.profesional}
        duracionMin={duracionMin}
        seleccion={seleccion}
        onElegir={(s) => {
          reagendar.reset();
          setSeleccion(s);
        }}
      />

      <ScrollView className="max-h-80 flex-grow-0 border-t border-borde" contentContainerStyle={{ padding: 16 }}>
        <Text className="font-texto text-base text-primary">
          {seleccion
            ? `${etiquetaDia(seleccion.fecha).largo}, ${formatoHora(seleccion.inicioMin)} · ${duracionMin} min · ${formatoCOP(cita.total)}`
            : 'Elige el nuevo horario'}
        </Text>
        {esMismoHorario ? (
          <Text className="font-texto text-sm text-peligro">Ese es tu horario actual. Elige otro.</Text>
        ) : null}

        <View className="my-3 rounded-xl border border-borde p-3">
          <Text className="font-titulo text-base text-primary">Tu anticipo se mueve contigo</Text>
          {opcion.caso === 'futura' ? (
            <Text className="font-texto text-sm text-secondary">
              {opcion.trasladado > 0
                ? `Tus ${formatoCOP(opcion.trasladado)} se aplicarán completos a la nueva cita. Saldo: ${formatoCOP(saldo)}.`
                : `No tienes anticipo aprobado: pagas ${formatoCOP(cita.total)} en el local.`}{' '}
              Cambias con {NEGOCIO.horasMinimasCancelarSinMulta} horas o más; no hay multa.
            </Text>
          ) : (
            <Text className="font-texto text-sm text-secondary">
              {opcion.trasladado > 0
                ? `Del anticipo, después de la multa, pasan ${formatoCOP(opcion.trasladado)} a la nueva cita.`
                : 'Del anticipo no quedó sobrante después de la multa.'}{' '}
              {opcion.diferencia > 0
                ? `Para completar el anticipo de ${formatoCOP(NEGOCIO.abonoMinimo)} pagas ${formatoCOP(opcion.diferencia)} más con un comprobante.`
                : ''}
            </Text>
          )}
          <Text className="mt-1 font-texto text-sm text-secondary">
            Tu franja actual se libera solo cuando se confirme el cambio.
          </Text>
        </View>

        {reagendar.isError ? (
          <AvisoEscritura error={reagendar.error} mensaje={mensajeDeReagendar(reagendar.error)} />
        ) : null}
        <Boton disabled={!seleccionLibre || esMismoHorario} cargando={ocupado} onPress={confirmar}>
          {reagendar.isError ? 'Reintentar cambio' : 'Confirmar cambio de horario'}
        </Boton>
      </ScrollView>
    </View>
  );
}

/**
 * Vista después de que la base confirmó el reagendamiento. La fecha nueva se lee de la cita
 * nueva guardada (no de lo que eligió la pantalla): si la petición se repitió sin conexión,
 * la base devuelve la cita que ya había creado (RN-14).
 */
function ReagendamientoHecho({ cita, resultado }: { cita: Cita; resultado: ResultadoReagendar }) {
  const cliente = useSesionStore((s) => s.usuario?.nombre ?? '');
  const nueva = useCita(resultado.citaId);
  const [errorWhatsApp, setErrorWhatsApp] = useState(false);

  if (nueva.isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando tu nueva cita…" />;
  if (nueva.isError || !nueva.data) {
    return (
      <EstadoPantalla
        tipo="error"
        error={nueva.error}
        mensaje={`Tu cita quedó reagendada (${codigoCita(resultado.citaId)}), pero no pudimos cargarla. ${nueva.isError ? mensajeDeError(nueva.error) : ''}`}
        onReintentar={() => void nueva.refetch()}
      />
    );
  }
  const citaNueva = nueva.data;

  const avisar = async () => {
    setErrorWhatsApp(false);
    const enlace = enlaceWhatsApp(
      mensajeReagendamiento({
        cliente,
        profesional: cita.profesional,
        servicios: cita.servicios.map((s) => s.nombre),
        total: cita.total,
        codigoAnterior: codigoCita(cita.id),
        codigoNuevo: codigoCita(citaNueva.id),
        fechaAnterior: formatoFechaHoraBogota(cita.inicio),
        fechaNueva: formatoFechaHoraBogota(citaNueva.inicio),
        anticipoTrasladado: resultado.anticipoTrasladado,
        diferencia: resultado.diferencia,
        noAsistida: resultado.caso === 'no_asistida',
      }),
    );
    try {
      await Linking.openURL(enlace);
    } catch {
      setErrorWhatsApp(true);
    }
  };

  const verNueva = () => router.replace({ pathname: '/cita/[id]', params: { id: citaNueva.id } });

  return (
    <ScrollView className="flex-1 bg-fondo" contentContainerStyle={{ padding: 24 }}>
      <View className="mb-6 items-center">
        <Ionicons name="checkmark-circle" size={56} color="#111111" />
        <Text className="mt-2 font-titulo text-2xl text-primary">Cita reagendada</Text>
        <Text className="text-center font-texto text-base text-secondary">
          {codigoCita(citaNueva.id)} · {citaNueva.profesional} · {formatoFechaHoraBogota(citaNueva.inicio)}
        </Text>
        <Text className="mt-1 text-center font-texto text-sm text-secondary">
          Antes: {codigoCita(cita.id)} · {formatoFechaHoraBogota(cita.inicio)}
        </Text>
      </View>

      <View className="mb-6 rounded-xl border border-borde p-4">
        <Fila texto="Anticipo que pasó" valor={formatoCOP(resultado.anticipoTrasladado)} />
        <Fila texto="Total de la cita" valor={formatoCOP(citaNueva.total)} />
        <View className="mt-3 flex-row justify-between border-t border-borde pt-3">
          <Text className="font-titulo text-base text-primary">Saldo por pagar</Text>
          <Text className="font-titulo text-base text-primary">
            {formatoCOP(calcularSaldo(citaNueva.total, citaNueva.anticipoAprobado))}
          </Text>
        </View>
        {resultado.diferencia > 0 ? (
          <Text className="mt-3 font-texto text-sm text-peligro">
            Falta pagar {formatoCOP(resultado.diferencia)} para completar el anticipo de{' '}
            {formatoCOP(NEGOCIO.abonoMinimo)}. Cuenta cuando el local apruebe tu comprobante.
          </Text>
        ) : null}
      </View>

      {resultado.diferencia > 0 ? (
        <Boton
          className="mb-3"
          onPress={() =>
            router.replace({ pathname: '/cita/[id]/anticipo', params: { id: citaNueva.id } })
          }
        >
          {`Pagar ${formatoCOP(resultado.diferencia)}`}
        </Boton>
      ) : null}

      <Text className="mb-3 font-texto text-sm text-secondary">
        Avísale al local por WhatsApp: el mensaje ya va escrito, solo pulsas enviar.
      </Text>
      <Boton
        variante={resultado.diferencia > 0 ? 'borde' : 'relleno'}
        className="mb-3"
        onPress={avisar}
      >
        Abrir WhatsApp con el aviso
      </Boton>
      {errorWhatsApp ? (
        <Text className="mb-3 font-texto text-sm text-peligro">
          No pudimos abrir WhatsApp. Tu cita ya quedó reagendada.
        </Text>
      ) : null}
      <Boton variante="borde" onPress={verNueva}>
        Ver mi nueva cita
      </Boton>
    </ScrollView>
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
