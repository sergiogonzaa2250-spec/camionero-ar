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
      "Puente Bartolomé Mitre integrante del Complejo Zárate - Brazo Largo. La circulación de vehículos de cargas debe analizarse considerando las condiciones estructurales, peso total, peso por eje y eventuales restricciones vigentes.",

    limite: 150,
    unidad: "t",

    vehiculos: [
      "camion",
      "camionAcoplado",
      "camionSemirremolque",
      "bitren"
    ],

    puntos: [
      {
        lat: -34.103261,
        lon: -59.002664,
        descripcion:
          "Referencia geográfica del Puente Bartolomé Mitre"
      }
    ],

    condiciones: [
      "Consultar condiciones vigentes de la Dirección Nacional de Vialidad.",
      "Verificar límite de peso por eje.",
      "Verificar peso bruto total del vehículo.",
      "Verificar restricciones eventuales antes de circular.",
      "La proximidad geográfica al puente no constituye autorización de circulación."
    ],

    estado: "CONDICIONAL",

    fuente:
      "Dirección Nacional de Vialidad",

    documento:
      "Listado de Puentes Limitados - julio 2025",

    fechaVerificacion:
      "2026-09-01"
  },

  {
    id: "puente-urquiza-rn12",
    nombre: "Puente Justo José de Urquiza",
    tipo: "PUENTE",
    ruta: "RN 12",

    descripcion:
      "Puente Justo José de Urquiza integrante del Complejo Zárate - Brazo Largo. La circulación de vehículos de cargas debe analizarse considerando las condiciones estructurales, peso total, peso por eje y eventuales restricciones vigentes.",

    limite: 150,
    unidad: "t",

    vehiculos: [
      "camion",
      "camionAcoplado",
      "camionSemirremolque",
      "bitren"
    ],

    puntos: [
      {
        lat: -33.909828,
        lon: -58.884831,
        descripcion:
          "Referencia geográfica del Puente Justo José de Urquiza"
      }
    ],

    condiciones: [
      "Consultar condiciones vigentes de la Dirección Nacional de Vialidad.",
      "Verificar límite de peso por eje.",
      "Verificar peso bruto total del vehículo.",
      "Verificar restricciones eventuales antes de circular.",
      "La proximidad geográfica al puente no constituye autorización de circulación."
    ],

    estado: "CONDICIONAL",

    fuente:
      "Dirección Nacional de Vialidad",

    documento:
      "Listado de Puentes Limitados - julio 2025",

    fechaVerificacion:
      "2026-09-01"
  }
];
