// Gestión del administrador (mockup "Lo que ofrece el local"): pestañas Servicios (RF-26),
// Productos (RF-27) y Profesionales (RF-29). Cada pestaña maneja carga, error con Reintentar,
// vacío y sin conexión.
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import Chip from '@/components/Chip';
import EstadoPantalla from '@/components/EstadoPantalla';
import ListaGestion from '@/components/gestion/ListaGestion';
import {
  useCambiarActivoProducto,
  useCambiarActivoProfesional,
  useCambiarActivoServicio,
  useProductosGestion,
  useProfesionalesGestion,
  useServiciosGestion,
} from '@/hooks/useGestion';
import { formatoCOP } from '@/lib/dinero';
import {
  coincideProducto,
  coincideProfesional,
  coincideServicio,
  resumenProfesional,
  resumenServicio,
} from '@/lib/gestion';

type Pestana = 'servicios' | 'productos' | 'profesionales';

function PestanaServicios() {
  const servicios = useServiciosGestion();
  const cambiar = useCambiarActivoServicio();

  if (servicios.isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando los servicios…" />;
  if (servicios.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        error={servicios.error}
        onReintentar={() => void servicios.refetch()}
      />
    );
  }

  const elementos = servicios.data.map((s) => ({
    ...s,
    subtitulo: `${s.esAdicional ? 'Adicional · ' : ''}${resumenServicio(s)}`,
    detalle: formatoCOP(s.precio),
  }));

  return (
    <ListaGestion
      singular="servicio"
      plural="servicios"
      icono="cut-outline"
      elementos={elementos}
      coincide={coincideServicio}
      onNuevo={() => router.push('/panel/servicio')}
      onEditar={(id) => router.push({ pathname: '/panel/servicio', params: { id } })}
      cambiarActivo={(id, activo) => cambiar.mutateAsync({ id, activo })}
      refrescando={servicios.isRefetching}
      onRefrescar={() => void servicios.refetch()}
    />
  );
}

function PestanaProductos() {
  const productos = useProductosGestion();
  const cambiar = useCambiarActivoProducto();

  if (productos.isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando los productos…" />;
  if (productos.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        error={productos.error}
        onReintentar={() => void productos.refetch()}
      />
    );
  }

  const elementos = productos.data.map((p) => ({
    ...p,
    subtitulo: `${p.categoria === 'barba' ? 'Barba' : p.categoria === 'cabello' ? 'Cabello' : 'Sin categoría'}${
      p.descripcion ? ` · ${p.descripcion}` : ''
    }`,
    detalle: formatoCOP(p.precio),
    imagen: p.foto,
  }));

  return (
    <ListaGestion
      singular="producto"
      plural="productos"
      icono="bag-outline"
      elementos={elementos}
      coincide={coincideProducto}
      onNuevo={() => router.push('/panel/producto')}
      onEditar={(id) => router.push({ pathname: '/panel/producto', params: { id } })}
      cambiarActivo={(id, activo) => cambiar.mutateAsync({ id, activo })}
      refrescando={productos.isRefetching}
      onRefrescar={() => void productos.refetch()}
    />
  );
}

function PestanaProfesionales() {
  const profesionales = useProfesionalesGestion();
  const cambiar = useCambiarActivoProfesional();

  if (profesionales.isPending) return <EstadoPantalla tipo="carga" mensaje="Cargando los profesionales…" />;
  if (profesionales.isError) {
    return (
      <EstadoPantalla
        tipo="error"
        error={profesionales.error}
        onReintentar={() => void profesionales.refetch()}
      />
    );
  }

  const elementos = profesionales.data.map((p) => ({
    ...p,
    subtitulo: resumenProfesional(p),
    detalle: p.cuenta?.correo || 'Sin cuenta vinculada',
    imagen: p.foto,
  }));

  return (
    <ListaGestion
      singular="profesional"
      plural="profesionales"
      icono="person-outline"
      elementos={elementos}
      coincide={coincideProfesional}
      onNuevo={() => router.push('/panel/profesional')}
      onEditar={(id) => router.push({ pathname: '/panel/profesional', params: { id } })}
      avisoDesactivar="Los clientes dejarán de verlo al reservar. Sus citas ya reservadas siguen en la agenda y su cuenta conserva el acceso a su agenda. No se borra: puedes reactivarlo cuando quieras."
      cambiarActivo={(id, activo) => cambiar.mutateAsync({ id, activo })}
      refrescando={profesionales.isRefetching}
      onRefrescar={() => void profesionales.refetch()}
    />
  );
}

export default function Gestion() {
  const [pestana, setPestana] = useState<Pestana>('servicios');

  return (
    <View className="flex-1 bg-fondo">
      <View className="px-4 pt-4">
        <Text className="font-titulo text-2xl text-primary">Lo que ofrece el local.</Text>
        <View className="mt-3 flex-row flex-wrap">
          <Chip etiqueta="Servicios" activo={pestana === 'servicios'} onPress={() => setPestana('servicios')} />
          <Chip etiqueta="Productos" activo={pestana === 'productos'} onPress={() => setPestana('productos')} />
          <Chip
            etiqueta="Profesionales"
            activo={pestana === 'profesionales'}
            onPress={() => setPestana('profesionales')}
          />
        </View>
      </View>
      {pestana === 'servicios' ? (
        <PestanaServicios />
      ) : pestana === 'productos' ? (
        <PestanaProductos />
      ) : (
        <PestanaProfesionales />
      )}
    </View>
  );
}
