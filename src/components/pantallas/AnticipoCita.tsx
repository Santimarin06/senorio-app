// Cuerpo de "A tu ritmo, también el pago" (RF-13, RN-07, RN-08, D-06, D-28). El cliente elige
// sin anticipo, abono o total, ve los datos de pago, elige la imagen y la envía. Solo cuando la
// base registró el comprobante se pasa a "Recibido para revisión" (RN-12, RN-14).
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import AvisoEscritura from '@/components/AvisoEscritura';
import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import PantallaPendiente from '@/components/PantallaPendiente';
import SelectorImagenComprobante from '@/components/SelectorImagenComprobante';
import { MEDIOS_PAGO, NEGOCIO } from '@/config/negocio';
import { useMultaPendiente } from '@/hooks/useCita';
import { useEnviarComprobante } from '@/hooks/useComprobante';
import { useElegirImagen } from '@/hooks/useElegirImagen';
import { codigoCita } from '@/lib/codigoCita';
import { montoAnticipo, ofreceAnticipo, puedeEnviarComprobante } from '@/lib/comprobante';
import { mensajeDeComprobante } from '@/lib/errores';
import { calcularSaldo, formatoCOP, rangoAnticipo } from '@/lib/finanzas';
import { ETIQUETA_ANTICIPO, ETIQUETA_ESTADO } from '@/models/cita.mapper';
import type { Cita, MedioPago, TipoAnticipo } from '@/types/entidades';

type Opcion = 'sin' | TipoAnticipo;

const OPCIONES: { valor: Opcion; etiqueta: string }[] = [
  { valor: 'sin', etiqueta: 'Sin anticipo' },
  { valor: 'abono', etiqueta: 'Abono' },
  { valor: 'total', etiqueta: 'Total' },
];

export default function AnticipoCita({ cita }: { cita: Cita }) {
  const multa = useMultaPendiente();
  const enviar = useEnviarComprobante();
  const selector = useElegirImagen();
  const [opcion, setOpcion] = useState<Opcion>('abono');
  const [montoTexto, setMontoTexto] = useState('');
  const [medio, setMedio] = useState<MedioPago | null>(null);
  const [intento, setIntento] = useState(false);

  const volver = () => router.navigate({ pathname: '/cita/[id]', params: { id: cita.id } });
  const verComprobante = () =>
    router.navigate({ pathname: '/cita/[id]/comprobante', params: { id: cita.id } });

  // Guardas, en orden: la cita ya no admite anticipo, ya tiene uno vigente, vale menos del
  // mínimo (D-28) o el cliente tiene una multa pendiente (RN-07, D-06).
  if (cita.estado !== 'confirmada' || Date.parse(cita.inicio) <= Date.now()) {
    return (
      <PantallaPendiente
        icono="wallet-outline"
        mensaje={`Esta cita ya no admite anticipo. Estado: ${ETIQUETA_ESTADO[cita.estado]}.`}
        acciones={[{ texto: 'Volver a la cita', onPress: volver }]}
      />
    );
  }
  if (!puedeEnviarComprobante(cita.anticipo, cita.total, cita.anticipoTrasladado)) {
    return (
      <PantallaPendiente
        icono="receipt-outline"
        mensaje={`Ya enviaste un comprobante para esta cita. Estado: ${ETIQUETA_ANTICIPO[cita.anticipo.estado]}.`}
        acciones={[
          { texto: 'Ver comprobante', onPress: verComprobante },
          { texto: 'Volver a la cita', onPress: volver },
        ]}
      />
    );
  }
  if (!ofreceAnticipo(cita.total)) {
    return (
      <PantallaPendiente
        icono="wallet-outline"
        mensaje={`Esta cita vale ${formatoCOP(cita.total)}, menos que el abono mínimo de ${formatoCOP(NEGOCIO.abonoMinimo)}. No necesita anticipo: pagas todo en el local.`}
        acciones={[{ texto: 'Volver a la cita', onPress: volver }]}
      />
    );
  }
  if (multa.isPending) return <EstadoPantalla tipo="carga" mensaje="Revisando tus multas…" />;
  if (multa.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        error={multa.error}
        onReintentar={() => void multa.refetch()}
      />
    );
  }
  if (multa.data > 0) {
    return (
      <PantallaPendiente
        icono="alert-circle-outline"
        mensaje={`Tienes una multa pendiente de ${formatoCOP(multa.data)}. Hasta pagarla o que el local la perdone no puedes enviar anticipos ni hacer reservas nuevas.`}
        acciones={[
          { texto: 'Ver mi multa', onPress: () => router.navigate('/cuenta') },
          { texto: 'Volver a la cita', onPress: volver },
        ]}
      />
    );
  }

  const tipo: TipoAnticipo | null = opcion === 'sin' ? null : opcion;
  const monto = tipo ? montoAnticipo(tipo, montoTexto, cita.total, cita.anticipoTrasladado) : null;
  const montoValido = monto?.ok ? monto.valor : null;
  // El error del monto aparece en cuanto se escribe algo o al intentar enviar.
  const errorMonto =
    tipo === 'abono' && monto && !monto.ok && (montoTexto !== '' || intento)
      ? monto.error
      : undefined;
  const ocupado = enviar.isPending;
  // D-45: con anticipo trasladado de un reagendamiento, el pago completa lo que falta.
  const rango = rangoAnticipo(cita.total, cita.anticipoTrasladado);
  const trasladado = cita.anticipoTrasladado;
  const rechazado = cita.anticipo.estado === 'rechazado' ? cita.anticipo.comprobante : null;

  const confirmar = () => {
    setIntento(true);
    if (!tipo || montoValido === null || !medio || !selector.imagen) return;
    enviar.mutate(
      {
        modo: 'nuevo',
        citaId: cita.id,
        tipo,
        monto: montoValido,
        metodo: medio,
        imagen: selector.imagen,
      },
      {
        onSuccess: () =>
          router.replace({ pathname: '/cita/[id]/comprobante', params: { id: cita.id } }),
      },
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-fondo"
      contentContainerStyle={{ padding: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="font-texto text-sm text-secondary">ANTICIPO · {codigoCita(cita.id)}</Text>
      <Text className="font-titulo text-2xl text-primary">A tu ritmo, también el pago.</Text>
      <Text className="mb-4 mt-1 font-texto text-base text-secondary">
        Tu cita está confirmada. Elige si quieres adelantar una parte o pagar todo.
      </Text>

      {trasladado > 0 ? (
        <Text className="mb-4 font-texto text-base text-primary">
          De tu cita anterior pasaron {formatoCOP(trasladado)}.{' '}
          {trasladado < NEGOCIO.abonoMinimo
            ? `Paga al menos ${formatoCOP(rango.minimo)} para completar el anticipo mínimo de ${formatoCOP(NEGOCIO.abonoMinimo)}.`
            : 'Si quieres, adelanta otra parte.'}
        </Text>
      ) : null}

      {rechazado ? (
        <Text className="mb-4 font-texto text-sm text-peligro">
          Tu comprobante anterior fue rechazado
          {rechazado.notaRechazo ? `: ${rechazado.notaRechazo}` : '.'} Puedes enviar otro.
        </Text>
      ) : null}

      <View className="mb-2 flex-row flex-wrap">
        {OPCIONES.map((o) => (
          <Chip
            key={o.valor}
            etiqueta={o.etiqueta}
            activo={opcion === o.valor}
            onPress={() => !ocupado && setOpcion(o.valor)}
          />
        ))}
      </View>

      {opcion === 'sin' ? (
        <View className="my-4">
          <Text className="mb-4 font-texto text-base text-primary">
            Sin anticipo pagas {formatoCOP(calcularSaldo(cita.total, cita.anticipoAprobado))} en el local el día de tu cita. No se guarda
            nada nuevo.
          </Text>
          <Boton onPress={volver}>Volver a la cita</Boton>
        </View>
      ) : (
        <>
          {opcion === 'abono' ? (
            <CampoTexto
              etiqueta="Monto del abono"
              value={montoTexto}
              onChangeText={setMontoTexto}
              keyboardType="number-pad"
              placeholder="20.000"
              editable={!ocupado}
              error={errorMonto}
            />
          ) : null}
          <Text className="mb-4 font-texto text-sm text-secondary">
            {opcion === 'abono'
              ? `Mínimo ${formatoCOP(rango.minimo)} · Máximo ${formatoCOP(rango.maximo)}`
              : trasladado > 0
                ? `Pagas lo que falta de la cita: ${formatoCOP(rango.maximo)}.`
                : 'Pagas el valor completo de la cita.'}
          </Text>

          <View className="mb-6 rounded-xl border border-borde p-4">
            <Fila texto="Total de tu cita" valor={formatoCOP(cita.total)} />
            <Fila
              texto={
                opcion === 'abono' ? 'Saldo si se aprueba el abono' : 'Saldo si se aprueba el pago'
              }
              valor={
                montoValido === null
                  ? '—'
                  : formatoCOP(calcularSaldo(cita.total, cita.anticipoAprobado + montoValido))
              }
            />
          </View>

          <Text className="mb-2 font-titulo text-base text-primary">¿A dónde transfieres?</Text>
          {MEDIOS_PAGO.map((m) => (
            <View
              key={m.id}
              className={`mb-2 rounded-xl border p-4 ${medio === m.id ? 'border-primary' : 'border-borde'}`}
            >
              <Text className="font-texto text-base text-primary">{m.nombre}</Text>
              {/* selectable: el cliente copia el dato con una pulsación larga. */}
              <Text selectable className="font-texto text-base text-secondary">
                {m.etiqueta}: {m.dato}
              </Text>
              <Boton
                variante={medio === m.id ? 'relleno' : 'texto'}
                className="mt-2"
                disabled={ocupado}
                onPress={() => setMedio(m.id)}
              >
                {medio === m.id ? `Pagué con ${m.nombre}` : `Elegir ${m.nombre}`}
              </Boton>
            </View>
          ))}
          <Text className="mb-1 font-texto text-sm text-secondary">
            Transferencia directa · Sin pasarela de pagos.
          </Text>
          {intento && !medio ? (
            <Text className="mb-1 font-texto text-sm text-peligro">
              Elige el medio con el que pagaste.
            </Text>
          ) : null}

          <Text className="mb-2 mt-4 font-titulo text-base text-primary">Comprobante</Text>
          <SelectorImagenComprobante selector={selector} deshabilitado={ocupado} />
          {intento && !selector.imagen && !selector.error ? (
            <Text className="mb-2 font-texto text-sm text-peligro">
              Toma una foto o elige la imagen del comprobante.
            </Text>
          ) : null}

          {enviar.isError ? (
            <AvisoEscritura error={enviar.error} mensaje={mensajeDeComprobante(enviar.error)} />
          ) : null}
          <Boton className="mb-3" cargando={ocupado} onPress={confirmar}>
            {enviar.isError ? 'Reintentar envío' : 'Enviar comprobante'}
          </Boton>
          <Text className="font-texto text-sm text-secondary">
            El anticipo cuenta como pagado solo cuando el local aprueba el comprobante.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function Fila({ texto, valor }: { texto: string; valor: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="font-texto text-base text-primary">{texto}</Text>
      <Text className="font-titulo text-base text-primary">{valor}</Text>
    </View>
  );
}
