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
