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
    id: "puente-mitre-rn12",
    nombre: "Puente Bartolomé Mitre",
    tipo: "PUENTE",
    ruta: "RN 12",

    descripcion:
      "Puente Bartolomé Mitre del Complejo Zárate - Brazo Largo. El listado oficial de puentes limitados de la Dirección Nacional de Vialidad registra condiciones especiales de consulta para la circulación.",

    limite: 150,
    unidad: "t",

    puntos: [
      {
        lat: -34.103261,
        lon: -59.002664,
        descripcion:
          "Ubicación geográfica de referencia del Puente Bartolomé Mitre",
      },
    ],

    condiciones: [
      "Consultar condiciones vigentes de la Dirección Nacional de Vialidad.",
      "Verificar límite de peso por eje.",
      "Verificar el peso bruto total de la configuración.",
      "Verificar restricciones eventuales antes de circular.",
      "La proximidad geográfica no constituye autorización de circulación.",
    ],

    estado: "CONDICIONAL",

    fuente: "Dirección Nacional de Vialidad",

    documento:
      "Listado de Puentes Limitados - julio 2025",

    fechaVerificacion: "2026-09-01",
  },

  {
    id: "puente-urquiza-rn12",
    nombre: "Puente Justo José de Urquiza",
    tipo: "PUENTE",
    ruta: "RN 12",

    descripcion:
      "Puente Justo José de Urquiza del Complejo Zárate - Brazo Largo. El listado oficial de puentes limitados de la Dirección Nacional de Vialidad registra condiciones especiales de consulta para la circulación.",

    limite: 150,
    unidad: "t",

    puntos: [
      {
        lat: -33.909828,
        lon: -58.884831,
        descripcion:
          "Ubicación geográfica de referencia del Puente Justo José de Urquiza",
      },
    ],

    condiciones: [
      "Consultar condiciones vigentes de la Dirección Nacional de Vialidad.",
      "Verificar límite de peso por eje.",
      "Verificar el peso bruto total de la configuración.",
      "Verificar restricciones eventuales antes de circular.",
      "La proximidad geográfica no constituye autorización de circulación.",
    ],

    estado: "CONDICIONAL",

    fuente: "Dirección Nacional de Vialidad",

    documento:
      "Listado de Puentes Limitados - julio 2025",

    fechaVerificacion: "2026-09-01",
  },
];
