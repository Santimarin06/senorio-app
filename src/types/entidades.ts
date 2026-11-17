// Modelos internos de la app (camelCase), como Movie en 06-Peliculas.
// Dinero: pesos COP enteros. Duraciones: minutos.

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
  /** Adicional como la silla relajante: solo se elige junto a un servicio principal (D-02). */
  esAdicional: boolean;
}

export interface Profesional {
  id: string;
  nombre: string;
  cargo: string;
  /** null cuando no hay foto: la tarjeta muestra un ícono en su lugar. */
  foto: string | null;
}

export interface ProfesionalDetalle extends Profesional {
  servicios: Servicio[];
}

/** Categorías del catálogo de productos (RF-27). */
export type CategoriaProducto = 'cabello' | 'barba';

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  foto: string | null;
  /** null si la base trae una categoría desconocida: el producto solo aparece en "Todos". */
  categoria: CategoriaProducto | null;
}

/** Servicio en la gestión del administrador (RF-26): incluye los desactivados. */
export interface ServicioGestion extends Servicio {
  activo: boolean;
  /** Quién lo presta (profesional_servicios), por nombre. */
  profesionales: { id: string; nombre: string; activo: boolean }[];
}

/** Datos ya validados del formulario de servicio (RF-26). */
export interface ServicioFormulario {
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
  esAdicional: boolean;
  /** Ids de los profesionales que lo prestan (al menos uno activo). */
  profesionales: string[];
}

/** Producto en la gestión del administrador (RF-27): incluye los desactivados. */
export interface ProductoGestion extends Producto {
  activo: boolean;
}

/** Datos ya validados del formulario de producto (RF-27). */
export interface ProductoFormulario {
  nombre: string;
  descripcion: string;
  categoria: CategoriaProducto;
  precio: number;
  /** URL pública de la foto en el bucket "fotos", o null para la imagen de reemplazo. */
  foto: string | null;
}

/** Estados de la cita (D-15). */
export type EstadoCita =
  | 'confirmada'
  | 'por_marcar'
  | 'asistida'
  | 'no_asistida'
  | 'cancelada_a_tiempo'
  | 'cancelada_tarde'
  | 'reagendada';

export interface Cita {
  id: string;
  /** Instantes en UTC (ISO). Se muestran en hora de Bogotá. */
  inicio: string;
  fin: string;
  estado: EstadoCita;
  total: number;
  profesional: string;
  servicios: { nombre: string; precio: number; duracionMin: number }[];
  /** Suma de los comprobantes aprobados por el administrador (RN-09). */
  anticipoAprobado: number;
  /** Estado del anticipo y el comprobante que lo respalda (D-15). */
  anticipo: Anticipo;
}

/** Cita vista desde el panel (RF-21, RF-22): con el cliente y sin el detalle del comprobante. */
export interface CitaAgenda {
  id: string;
  inicio: string;
  fin: string;
  estado: EstadoCita;
  total: number;
  profesionalId: string;
  profesional: string;
  cliente: { nombre: string; telefono: string };
  servicios: { nombre: string; precio: number; duracionMin: number }[];
  /** Suma de los comprobantes aprobados (RN-09); 0 si no hay anticipo aprobado. */
  anticipoAprobado: number;
}

/** Marca de asistencia que pone el profesional o el administrador (RF-23). */
export type MarcaAsistencia = Extract<EstadoCita, 'asistida' | 'no_asistida'>;

/** Anticipo de la cita (RF-13): abono entre $10.000 y el total, o el total. */
export type TipoAnticipo = 'abono' | 'total';

/** Medios de pago de MEDIOS_PAGO (D-04). */
export type MedioPago = 'nequi' | 'bold' | 'bancolombia';

export type EstadoComprobante = 'pendiente' | 'aprobado' | 'rechazado';

/** Estados del anticipo (D-15). */
export type EstadoAnticipo = 'sin_anticipo' | EstadoComprobante;

export interface Comprobante {
  id: string;
  tipo: TipoAnticipo;
  monto: number;
  estado: EstadoComprobante;
  notaRechazo: string | null;
  /** Ruta en el bucket privado: <cliente_id>/<archivo>. */
  archivoPath: string;
  metodo: MedioPago | null;
  /** Instante UTC (ISO) en que se subió la imagen vigente. */
  subidoEn: string;
}

export interface Anticipo {
  estado: EstadoAnticipo;
  /** El comprobante vigente o, si no hay, el rechazado más reciente; null sin anticipo. */
  comprobante: Comprobante | null;
}

export type EstadoMulta = 'pendiente' | 'cobrada_anticipo' | 'pagada' | 'perdonada';

/** Resultado de cancelar según la base (RF-09). Manda sobre el cálculo previo de la pantalla. */
export interface ResultadoCancelacionBase {
  estado: Extract<EstadoCita, 'cancelada_a_tiempo' | 'cancelada_tarde'>;
  anticipoAprobado: number;
  /** null si la cancelación no generó multa. */
  multaEstado: EstadoMulta | null;
}

/** Lo que hace falta de la base para calcular la disponibilidad de una semana (RF-04). */
export interface OcupacionSemana {
  /** Citas activas y bloqueos del profesional, instantes UTC (ISO). */
  ocupadas: { inicio: string; fin: string }[];
  /** Festivos de la semana, 'YYYY-MM-DD'. */
  festivos: string[];
  /** Fechas con horario especial (dias_habilitados), en minutos desde medianoche. */
  especiales: { fecha: string; abierto: boolean; abreMin: number; cierraMin: number }[];
}

/** Imagen elegida para el comprobante, ya leída y validada (JPG o PNG de hasta 5 MB). */
export interface ImagenComprobante {
  /** Archivo local del teléfono, para la vista previa. */
  uri: string;
  nombre: string;
  bytes: ArrayBuffer;
  mime: 'image/jpeg' | 'image/png';
  tamano: number;
}

/** Excepción de dias_habilitados (RF-24, D-24): manda sobre el horario normal de su fecha. */
export interface DiaEspecial {
  fecha: string;
  /** false = el local no atiende ese día. */
  abierto: boolean;
  /** Minutos desde medianoche, hora de Bogotá. */
  abreMin: number;
  cierraMin: number;
  nota: string | null;
}

/** Bloqueo del administrador (RF-24): franjas que dejan de ofrecerse. */
export interface Bloqueo {
  id: string;
  /** null = todo el local. */
  profesionalId: string | null;
  /** Nombre del profesional, o null si es de todo el local. */
  profesional: string | null;
  /** Instantes UTC (ISO). */
  inicio: string;
  fin: string;
  motivo: string;
}

/** Datos de la cita que necesita la revisión del administrador (RF-25, RF-28). */
export interface CitaRevision {
  id: string;
  inicio: string;
  estado: EstadoCita;
  total: number;
  profesional: string;
}

/** Comprobante por revisar (RF-28, RN-09), con su cita y su cliente. */
export interface ComprobanteRevision {
  id: string;
  tipo: TipoAnticipo;
  monto: number;
  metodo: MedioPago | null;
  subidoEn: string;
  archivoPath: string;
  cliente: string;
  cita: CitaRevision;
}

export type MotivoMulta = 'no_asistio' | 'cancelo_tarde';

/** Multa vista por el administrador (RF-25). */
export interface MultaRevision {
  id: string;
  motivo: MotivoMulta;
  monto: number;
  estado: EstadoMulta;
  resueltaEn: string | null;
  cliente: string;
  cita: CitaRevision;
}

/** Anticipo aprobado de una cita cancelada o no asistida que aún no se devolvió (RF-28). */
export interface DevolucionPendiente {
  comprobanteId: string;
  anticipoAprobado: number;
  cliente: string;
  telefono: string;
  cita: CitaRevision;
}
