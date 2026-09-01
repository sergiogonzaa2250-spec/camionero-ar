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

  lat?: number;

  lon?: number;

  horario?: string;

  condiciones?: string[];

  estado: EstadoRestriccion;

  fuente: string;

  documento?: string;

  fechaVerificacion: string;
};

/*
 * BASE INICIAL
 *
 * IMPORTANTE:
 * Esta base no debe interpretarse como un permiso
 * automático de circulación.
 *
 * Las restricciones que todavía no hayan sido
 * verificadas específicamente se mantienen como
 * DESCONOCIDA o CONDICIONAL.
 *
 * No se deben inventar límites ni restricciones.
 */


export const restricciones: Restriccion[] = [
  {
    id: "puente-rn12-zarate-brazo-largo",
    nombre: "Complejo Zárate - Brazo Largo",
    tipo: "PUENTE",
    ruta: "RN 12",
    descripcion:
      "Puente del Complejo Zárate - Brazo Largo. El listado oficial de puentes limitados indica consulta obligatoria a D.M.P. y V. para las condiciones de circulación.",
    limite: 150,
    unidad: "t",
    condiciones: [
      "Consultar D.M.P. y V.",
      "Verificar límite por eje.",
      "Verificar restricciones eventuales antes de circular.",
      "No interpretar este registro como autorización automática."
    ],
    estado: "CONDICIONAL",
    fuente: "Dirección Nacional de Vialidad",
    documento: "Listado de Puentes Limitados - julio 2025",
    fechaVerificacion: "2026-09-01"
  }
];
