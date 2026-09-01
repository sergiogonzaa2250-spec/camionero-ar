export type TipoVehiculo =
  | "camion"
  | "camionAcoplado"
  | "camionSemirremolque"
  | "bitren";

export type TipoRestriccion =
  | "PESO"
  | "PESO_EJE"
  | "ALTURA"
  | "ANCHO"
  | "LARGO"
  | "HORARIA"
  | "CIRCULACION"
  | "PUENTE"
  | "PERMISO";

export type EstadoRestriccion =
  | "VERIFICADA"
  | "CONDICIONAL"
  | "INCOMPATIBLE"
  | "DESCONOCIDA";

export type PuntoRestriccion = {
  lat: number;
  lon: number;
  descripcion?: string;
};

export type Restriccion = {
  id: string;
  nombre: string;
  tipo: TipoRestriccion;
  ruta: string;
  descripcion: string;

  limite?: number;
  unidad?: "t" | "m" | "t/eje";

  vehiculos?: TipoVehiculo[];

  desdeKm?: number;
  hastaKm?: number;

  puntos?: PuntoRestriccion[];

  horario?: string;

  condiciones?: string[];

  estado: EstadoRestriccion;

  fuente: string;
  documento?: string;
  fechaVerificacion: string;
};

export const restricciones: Restriccion[] = [
  {
    id: "puente-rn12-zarate-brazo-largo",
    nombre: "Complejo Zárate - Brazo Largo",
    tipo: "PUENTE",
    ruta: "RN 12",

    descripcion:
      "Complejo formado por los puentes Bartolomé Mitre y Justo José de Urquiza. El listado oficial de puentes limitados de la Dirección Nacional de Vialidad indica condiciones especiales de consulta para la circulación.",

    limite: 150,
    unidad: "t",

    condiciones: [
      "Consultar D.M.P. y V.",
      "Verificar límite por eje.",
      "Verificar restricciones eventuales antes de circular.",
      "No interpretar este registro como autorización automática.",
      "La restricción debe analizarse sobre el tramo correspondiente del complejo."
    ],

    estado: "CONDICIONAL",

    fuente: "Dirección Nacional de Vialidad",

    documento:
      "Listado de Puentes Limitados - julio 2025",

    fechaVerificacion: "2026-09-01"
  }
];
