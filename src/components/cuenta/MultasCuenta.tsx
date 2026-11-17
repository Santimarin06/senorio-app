// Multa pendiente en la Cuenta del cliente (RF-15, RN-07, D-06): por qué no puede reservar,
// con la cita, el motivo y el monto, y el contacto por WhatsApp para resolverla. La app no
// cobra la multa: el local la marca como pagada o la perdona desde Revisión (RF-25).
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import Boton from '@/components/Boton';
import EstadoPantalla from '@/components/EstadoPantalla';
import { NEGOCIO } from '@/config/negocio';
import { useMisMultasPendientes } from '@/hooks/useCita';
import { codigoCita } from '@/lib/codigoCita';
import { mensajeDeError } from '@/lib/errores';
import { formatoFechaHoraBogota, mayuscula } from '@/lib/fechas';
import { formatoCOP } from '@/lib/finanzas';
import { enlaceWhatsApp, mensajeMulta } from '@/lib/whatsapp';
import { MOTIVO_MULTA } from '@/models/revision.mapper';
import type { MotivoMulta, MultaRevision } from '@/types/entidades';

/** Explicación del motivo para el cliente, con los parámetros del negocio. */
const DETALLE_MOTIVO: Record<MotivoMulta, string> = {
  no_asistio: `No asististe después de ${NEGOCIO.toleranciaMinutos} minutos de tolerancia.`,
  cancelo_tarde: `Cancelaste con menos de ${NEGOCIO.horasMinimasCancelarSinMulta} horas de anticipación.`,
};

function TarjetaMulta({ multa }: { multa: MultaRevision }) {
  const [errorWhatsApp, setErrorWhatsApp] = useState(false);
  const codigo = codigoCita(multa.cita.id);
  const fechaHora = formatoFechaHoraBogota(multa.cita.inicio);

  const contactar = async () => {
    setErrorWhatsApp(false);
    const enlace = enlaceWhatsApp(
      mensajeMulta({ codigo, fechaHora, motivo: MOTIVO_MULTA[multa.motivo], monto: multa.monto }),
    );
    try {
      await Linking.openURL(enlace);
    } catch {
      setErrorWhatsApp(true);
    }
  };

  return (
    <View className="mb-4 rounded-xl border border-peligro p-4">
      <Text className="font-titulo text-lg text-primary">Una multa pendiente</Text>
      <Text className="mt-1 font-texto text-base text-primary">
        {codigo} · {mayuscula(fechaHora)} · {multa.cita.profesional}
      </Text>
      <Text className="mt-1 font-texto text-base text-primary">
        {DETALLE_MOTIVO[multa.motivo]} No tenías un anticipo aprobado para cubrirla.
      </Text>

      <View className="mt-3 flex-row items-center justify-between border-t border-borde pt-3">
        <Text className="font-texto text-base text-primary">Multa pendiente</Text>
        <Text className="font-titulo text-xl text-primary">{formatoCOP(multa.monto)}</Text>
      </View>

      <View className="mt-3 flex-row items-center">
        <Ionicons name="lock-closed" size={18} color="#B91C1C" />
        <Text className="ml-2 font-titulo text-base text-peligro">Siguiente reserva bloqueada</Text>
      </View>
      <Text className="mt-1 font-texto text-sm text-secondary">
        Hasta pagarla o que el local la perdone no puedes reservar ni enviar anticipos de citas
        nuevas. El pago se acuerda con el local; la app no cobra multas.
      </Text>

      <Boton className="mt-4" onPress={() => void contactar()}>
        Contactar al local
      </Boton>
      {errorWhatsApp ? (
        <Text className="mt-2 font-texto text-sm text-peligro">
          No pudimos abrir WhatsApp. Revisa que esté instalado en este teléfono.
        </Text>
      ) : null}
    </View>
  );
}

export default function MultasCuenta() {
  const multas = useMisMultasPendientes();

  if (multas.isPending) return <EstadoPantalla tipo="carga" mensaje="Revisando tus multas…" />;
  if (multas.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        mensaje={mensajeDeError(multas.error)}
        onReintentar={() => void multas.refetch()}
      />
    );
  }

  if (multas.data.length === 0) {
    return (
      <View className="mb-6 flex-row items-center rounded-xl border border-borde p-4">
        <Ionicons name="checkmark-circle-outline" size={22} color="#111111" />
        <Text className="ml-2 font-texto text-base text-primary">Sin multas pendientes</Text>
      </View>
    );
  }

  return (
    <View className="mb-2">
      {multas.data.map((m) => (
        <TarjetaMulta key={m.id} multa={m} />
      ))}
    </View>
  );
}
