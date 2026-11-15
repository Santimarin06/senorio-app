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

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  foto: string | null;
}
