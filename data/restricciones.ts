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

export const restricciones: Restriccion[] = [];

/*
 * Cuando incorporemos una restricción oficial,
 * tendrá esta estructura:
 *
 * {
 *   id: "puente-001",
 *   nombre: "Puente ...",
 *   tipo: "PUENTE",
 *   ruta: "RN XX",
 *   descripcion: "Descripción de la restricción.",
 *   limite: 30,
 *   unidad: "t",
 *   vehiculos: ["camionSemirremolque"],
 *   condiciones: [
 *     "Verificar configuración de ejes."
 *   ],
 *   estado: "VERIFICADA",
 *   fuente: "Vialidad Nacional",
 *   documento: "Documento oficial",
 *   fechaVerificacion: "2026-09-01"
 * }
 */
