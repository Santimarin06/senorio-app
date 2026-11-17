// Pestaña Comprobantes de Revisión (RF-28, RN-09, mockup "Revisar y resolver"): el
// administrador ve la imagen, confirma el anticipo o lo rechaza con motivo. Nada cambia en
// pantalla hasta que la base confirma (RN-12).
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import CampoTexto from '@/components/CampoTexto';
import EstadoPantalla from '@/components/EstadoPantalla';
import ImagenFirmada from '@/components/ImagenFirmada';
import { DatosCita, Fila } from '@/components/revision/PartesRevision';
import { MEDIOS_PAGO } from '@/config/negocio';
import { useComprobantesPendientes, useRevisarComprobante } from '@/hooks/useRevision';
import { codigoComprobante } from '@/lib/codigoCita';
import { mensajeDeError, mensajeDeRevision } from '@/lib/errores';
import { formatoFechaHoraBogota } from '@/lib/fechas';
import { formatoCOP } from '@/lib/finanzas';
import { efectoRevision, NOTA_RECHAZO_MAX, validarNotaRechazo } from '@/lib/revision';
import type { ComprobanteRevision } from '@/types/entidades';

export default function RevisionComprobantes() {
  const consulta = useComprobantesPendientes();
  const revisar = useRevisarComprobante();

  if (consulta.isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando comprobantes…" />;
  if (consulta.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        mensaje={mensajeDeError(consulta.error)}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }
  if (consulta.data.length === 0) {
    return (
      <EstadoPantalla tipo="vacio" icono="receipt-outline" mensaje="No hay comprobantes por revisar." />
    );
  }

  return (
    <View>
      {consulta.data.map((c) => (
        <TarjetaComprobante
          key={c.id}
          comprobante={c}
          guardando={revisar.isPending && revisar.variables.id === c.id ? revisar.variables.revision.estado : null}
          bloqueada={revisar.isPending}
          onRevisar={(revision, alTerminar) =>
            revisar.mutate(
              { id: c.id, revision },
              {
                onSuccess: alTerminar,
                onError: (e) => Alert.alert('No se guardó', mensajeDeRevision(e)),
              },
            )
          }
        />
      ))}
      <Text className="mt-1 font-texto text-sm text-secondary">
        Verifica el ingreso en la cuenta antes de aprobar.
      </Text>
    </View>
  );
}

interface Props {
  comprobante: ComprobanteRevision;
  guardando: 'aprobado' | 'rechazado' | null;
  bloqueada: boolean;
  onRevisar: (
    revision: { estado: 'aprobado' } | { estado: 'rechazado'; nota: string },
    alTerminar: () => void,
  ) => void;
}

function TarjetaComprobante({ comprobante: c, guardando, bloqueada, onRevisar }: Props) {
  const [rechazando, setRechazando] = useState(false);
  const [nota, setNota] = useState('');
  const [errorNota, setErrorNota] = useState<string | undefined>();

  const medio = MEDIOS_PAGO.find((m) => m.id === c.metodo)?.nombre;
  const esTotal = c.tipo === 'total';
  const tipoTexto = `${esTotal ? 'Pago total' : 'Abono'}${medio ? ` por ${medio}` : ''}`;
  // Con un solo comprobante vigente por cita, uno pendiente implica que no hay otro aprobado.
  const efecto = efectoRevision(c.cita.total, 0, c.monto);
  const accion = esTotal ? 'Confirmar pago' : 'Confirmar abono';

  const confirmar = () =>
    Alert.alert(
      `¿${accion}?`,
      `${c.cliente}: ${formatoCOP(c.monto)}. El anticipo queda aprobado y el saldo de la cita pasa a ${formatoCOP(efecto.saldoSiAprueba)}.`,
      [
        { text: 'Volver', style: 'cancel' },
        { text: accion, onPress: () => onRevisar({ estado: 'aprobado' }, () => undefined) },
      ],
    );

  const rechazar = () => {
    const v = validarNotaRechazo(nota);
    if (!v.ok) return setErrorNota(v.error);
    setErrorNota(undefined);
    onRevisar({ estado: 'rechazado', nota: v.nota }, () => setRechazando(false));
  };

  return (
    <View className="mb-4 rounded-xl border border-borde p-4">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-titulo text-lg text-primary">{c.cliente}</Text>
        <Text className="font-texto text-sm text-secondary">Pendiente de revisión</Text>
      </View>
      <Text className="font-texto text-sm text-secondary">{codigoComprobante(c.id)}</Text>
      <DatosCita cita={c.cita} />

      <View className="mt-3 flex-row items-end justify-between">
        <Text className="font-texto text-base text-primary">{tipoTexto}</Text>
        <Text className="font-titulo text-xl text-primary">{formatoCOP(c.monto)}</Text>
      </View>
      <Text className="font-texto text-sm text-secondary">
        Subido: {formatoFechaHoraBogota(c.subidoEn)}
      </Text>

      <ImagenFirmada archivoPath={c.archivoPath} />

      <Fila etiqueta="Total de la cita" valor={formatoCOP(c.cita.total)} />
      <Fila etiqueta={esTotal ? 'Pago por aprobar' : 'Abono por aprobar'} valor={formatoCOP(c.monto)} />
      <Text className="mt-2 font-texto text-sm text-primary">
        Si confirmas: anticipo aprobado {formatoCOP(efecto.anticipoSiAprueba)} y saldo{' '}
        {formatoCOP(efecto.saldoSiAprueba)}. Si rechazas: saldo {formatoCOP(efecto.saldoSiRechaza)}.
      </Text>

      {rechazando ? (
        <View className="mt-3">
          <CampoTexto
            etiqueta="Motivo del rechazo (lo ve el cliente)"
            value={nota}
            onChangeText={setNota}
            maxLength={NOTA_RECHAZO_MAX}
            placeholder="Ej.: no encontramos el ingreso en Nequi"
            multiline
            error={errorNota}
          />
          <Boton cargando={guardando === 'rechazado'} disabled={bloqueada} onPress={rechazar}>
            Rechazar comprobante
          </Boton>
          <Boton variante="texto" disabled={bloqueada} onPress={() => setRechazando(false)}>
            Volver
          </Boton>
        </View>
      ) : (
        <View className="mt-3 flex-row">
          <Boton
            variante="borde"
            className="mr-2 flex-1"
            disabled={bloqueada}
            onPress={() => setRechazando(true)}
          >
            Rechazar
          </Boton>
          <Boton className="flex-1" cargando={guardando === 'aprobado'} disabled={bloqueada} onPress={confirmar}>
            {accion}
          </Boton>
        </View>
      )}
    </View>
  );
}
