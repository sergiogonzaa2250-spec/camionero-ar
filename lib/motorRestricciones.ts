import {
  restricciones,
  Restriccion,
  TipoVehiculo,
  EstadoRestriccion,
} from "../datos/restricciones";

export type PuntoRuta = {
  lat: number;
  lon: number;
};

export type ResultadoRestriccion = {
  restriccion: Restriccion;
  estado: EstadoRestriccion;
  motivo: string;
  distanciaAproxKm?: number;
};

export type EvaluacionRestricciones = {
  estadoGeneral: EstadoRestriccion;
  resultados: ResultadoRestriccion[];
  cantidadVerificadas: number;
  cantidadCondicionales: number;
  cantidadIncompatibles: number;
  cantidadDesconocidas: number;
};

/*
 * Calcula una distancia aproximada entre dos coordenadas
 * utilizando la fórmula de Haversine.
 */
function distanciaKm(
  punto1: PuntoRuta,
  punto2: PuntoRuta
): number {
  const radioTierraKm = 6371;

  const lat1 = (punto1.lat * Math.PI) / 180;
  const lat2 = (punto2.lat * Math.PI) / 180;

  const deltaLat =
    ((punto2.lat - punto1.lat) * Math.PI) / 180;

  const deltaLon =
    ((punto2.lon - punto1.lon) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) *
      Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return radioTierraKm * c;
}

/*
 * Busca el punto de la ruta más cercano a una restricción
 * que tenga coordenadas.
 */
function distanciaRestriccionRuta(
  ruta: PuntoRuta[],
  restriccion: Restriccion
): number | undefined {
  if (
    restriccion.lat === undefined ||
    restriccion.lon === undefined ||
    ruta.length === 0
  ) {
    return undefined;
  }

  const puntoRestriccion: PuntoRuta = {
    lat: restriccion.lat,
    lon: restriccion.lon,
  };

  let menorDistancia = Infinity;

  for (const punto of ruta) {
    const distancia = distanciaKm(
      punto,
      puntoRestriccion
    );

    if (distancia < menorDistancia) {
      menorDistancia = distancia;
    }
  }

  return menorDistancia;
}

/*
 * Determina si la restricción corresponde al tipo
 * de vehículo seleccionado.
 */
function aplicaAvehiculo(
  restriccion: Restriccion,
  vehiculo: TipoVehiculo
): boolean {
  if (!restriccion.vehiculos) {
    return true;
  }

  return restriccion.vehiculos.includes(vehiculo);
}

/*
 * Evalúa una ruta contra la base de restricciones.
 *
 * IMPORTANTE:
 * Una restricción sin coordenadas todavía NO se considera
 * atravesada por la ruta.
 *
 * Esto evita generar falsos positivos.
 */
export function evaluarRestricciones(
  ruta: PuntoRuta[],
  vehiculo: TipoVehiculo,
  radioBusquedaKm: number = 1
): EvaluacionRestricciones {
  const resultados: ResultadoRestriccion[] = [];

  for (const restriccion of restricciones) {
    if (!aplicaAvehiculo(restriccion, vehiculo)) {
      continue;
    }

    const distancia = distanciaRestriccionRuta(
      ruta,
      restriccion
    );

    /*
     * Si la restricción todavía no tiene coordenadas,
     * no podemos afirmar que la ruta la atraviesa.
     */
    if (distancia === undefined) {
      resultados.push({
        restriccion,
        estado: "DESCONOCIDA",
        motivo:
          "La restricción existe en la base, pero todavía no tiene una ubicación geográfica suficiente para confirmar que la ruta la atraviesa.",
      });

      continue;
    }

    /*
     * Si está dentro del radio de búsqueda,
     * consideramos que requiere evaluación.
     */
    if (distancia <= radioBusquedaKm) {
      resultados.push({
        restriccion,
        estado: restriccion.estado,
        motivo:
          "La ruta pasa cerca de la ubicación registrada de la restricción.",
        distanciaAproxKm:
          Math.round(distancia * 100) / 100,
      });
    }
  }

  /*
   * Si no encontramos restricciones con ubicación,
   * no significa que la ruta esté libre.
   */
  if (resultados.length === 0) {
    return {
      estadoGeneral: "DESCONOCIDA",
      resultados: [],
      cantidadVerificadas: 0,
      cantidadCondicionales: 0,
      cantidadIncompatibles: 0,
      cantidadDesconocidas: 0,
    };
  }

  const cantidadVerificadas =
    resultados.filter(
      (r) => r.estado === "VERIFICADA"
    ).length;

  const cantidadCondicionales =
    resultados.filter(
      (r) => r.estado === "CONDICIONAL"
    ).length;

  const cantidadIncompatibles =
    resultados.filter(
      (r) => r.estado === "INCOMPATIBLE"
    ).length;

  const cantidadDesconocidas =
    resultados.filter(
      (r) => r.estado === "DESCONOCIDA"
    ).length;

  let estadoGeneral: EstadoRestriccion =
    "DESCONOCIDA";

  /*
   * Prioridad:
   * INCOMPATIBLE > CONDICIONAL > DESCONOCIDA > VERIFICADA
   */
  if (cantidadIncompatibles > 0) {
    estadoGeneral = "INCOMPATIBLE";
  } else if (cantidadCondicionales > 0) {
    estadoGeneral = "CONDICIONAL";
  } else if (cantidadDesconocidas > 0) {
    estadoGeneral = "DESCONOCIDA";
  } else if (cantidadVerificadas > 0) {
    estadoGeneral = "VERIFICADA";
  }

  return {
    estadoGeneral,
    resultados,
    cantidadVerificadas,
    cantidadCondicionales,
    cantidadIncompatibles,
    cantidadDesconocidas,
  };
}
