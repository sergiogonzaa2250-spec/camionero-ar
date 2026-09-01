import {
  restricciones,
  Restriccion,
  TipoVehiculo,
  EstadoRestriccion,
  PuntoRestriccion,
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
  puntoDetectado?: PuntoRestriccion;
};

export type EvaluacionRestricciones = {
  estadoGeneral: EstadoRestriccion;
  resultados: ResultadoRestriccion[];
  cantidadVerificadas: number;
  cantidadCondicionales: number;
  cantidadIncompatibles: number;
  cantidadDesconocidas: number;
};

function distanciaKm(
  punto1: PuntoRuta,
  punto2: PuntoRuta
): number {
  const radioTierraKm = 6371;

  const lat1 =
    (punto1.lat * Math.PI) / 180;

  const lat2 =
    (punto2.lat * Math.PI) / 180;

  const deltaLat =
    ((punto2.lat - punto1.lat) * Math.PI) /
    180;

  const deltaLon =
    ((punto2.lon - punto1.lon) * Math.PI) /
    180;

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

function distanciaRutaAPunto(
  ruta: PuntoRuta[],
  punto: PuntoRestriccion
): number | undefined {
  if (ruta.length === 0) {
    return undefined;
  }

  const puntoRuta: PuntoRuta = {
    lat: punto.lat,
    lon: punto.lon,
  };

  let menorDistancia = Infinity;

  for (const puntoActual of ruta) {
    const distancia = distanciaKm(
      puntoActual,
      puntoRuta
    );

    if (distancia < menorDistancia) {
      menorDistancia = distancia;
    }
  }

  if (!Number.isFinite(menorDistancia)) {
    return undefined;
  }

  return menorDistancia;
}

function buscarPuntoMasCercano(
  ruta: PuntoRuta[],
  puntos: PuntoRestriccion[]
): {
  distancia: number;
  punto: PuntoRestriccion;
} | undefined {
  let mejorResultado:
    | {
        distancia: number;
        punto: PuntoRestriccion;
      }
    | undefined;

  for (const punto of puntos) {
    const distancia = distanciaRutaAPunto(
      ruta,
      punto
    );

    if (distancia === undefined) {
      continue;
    }

    if (
      mejorResultado === undefined ||
      distancia < mejorResultado.distancia
    ) {
      mejorResultado = {
        distancia,
        punto,
      };
    }
  }

  return mejorResultado;
}

function aplicaAVehiculo(
  restriccion: Restriccion,
  vehiculo: TipoVehiculo
): boolean {
  if (!restriccion.vehiculos) {
    return true;
  }

  return restriccion.vehiculos.includes(
    vehiculo
  );
}

function evaluarUnaRestriccion(
  ruta: PuntoRuta[],
  restriccion: Restriccion,
  radioBusquedaKm: number
): ResultadoRestriccion | undefined {
  if (!restriccion.puntos || restriccion.puntos.length === 0) {
    return {
      restriccion,
      estado: "DESCONOCIDA",
      motivo:
        "La restricción existe en la base, pero todavía no tiene puntos geográficos suficientes para confirmar que la ruta la atraviesa.",
    };
  }

  const puntoMasCercano =
    buscarPuntoMasCercano(
      ruta,
      restriccion.puntos
    );

  if (!puntoMasCercano) {
    return {
      restriccion,
      estado: "DESCONOCIDA",
      motivo:
        "No fue posible calcular la distancia entre la geometría de la ruta y los puntos registrados de la restricción.",
    };
  }

  if (
    puntoMasCercano.distancia >
    radioBusquedaKm
  ) {
    return undefined;
  }

  const distanciaRedondeada =
    Math.round(
      puntoMasCercano.distancia * 100
    ) / 100;

  let motivo =
    "La ruta pasa cerca de una ubicación registrada de la restricción.";

  if (
    restriccion.estado === "CONDICIONAL"
  ) {
    motivo =
      "La ruta pasa cerca de una restricción condicional. Deben verificarse las condiciones específicas antes de autorizar la circulación.";
  }

  if (
    restriccion.estado === "INCOMPATIBLE"
  ) {
    motivo =
      "La ruta pasa cerca de una restricción marcada como incompatible con la configuración analizada.";
  }

  if (
    restriccion.estado === "VERIFICADA"
  ) {
    motivo =
      "La ruta pasa cerca de una restricción verificada registrada en la base.";
  }

  return {
    restriccion,
    estado: restriccion.estado,
    motivo,
    distanciaAproxKm:
      distanciaRedondeada,
    puntoDetectado:
      puntoMasCercano.punto,
  };
}

export function evaluarRestricciones(
  ruta: PuntoRuta[],
  vehiculo: TipoVehiculo,
  radioBusquedaKm: number = 1
): EvaluacionRestricciones {
  const resultados: ResultadoRestriccion[] =
    [];

  if (ruta.length === 0) {
    return {
      estadoGeneral: "DESCONOCIDA",
      resultados: [],
      cantidadVerificadas: 0,
      cantidadCondicionales: 0,
      cantidadIncompatibles: 0,
      cantidadDesconocidas: 0,
    };
  }

  for (const restriccion of restricciones) {
    if (
      !aplicaAVehiculo(
        restriccion,
        vehiculo
      )
    ) {
      continue;
    }

    const resultado =
      evaluarUnaRestriccion(
        ruta,
        restriccion,
        radioBusquedaKm
      );

    if (resultado) {
      resultados.push(resultado);
    }
  }

  const cantidadVerificadas =
    resultados.filter(
      (resultado) =>
        resultado.estado ===
        "VERIFICADA"
    ).length;

  const cantidadCondicionales =
    resultados.filter(
      (resultado) =>
        resultado.estado ===
        "CONDICIONAL"
    ).length;

  const cantidadIncompatibles =
    resultados.filter(
      (resultado) =>
        resultado.estado ===
        "INCOMPATIBLE"
    ).length;

  const cantidadDesconocidas =
    resultados.filter(
      (resultado) =>
        resultado.estado ===
        "DESCONOCIDA"
    ).length;

  let estadoGeneral:
    EstadoRestriccion =
    "DESCONOCIDA";

  /*
   * Prioridad de seguridad:
   *
   * INCOMPATIBLE
   *       ↓
   * CONDICIONAL
   *       ↓
   * DESCONOCIDA
   *       ↓
   * VERIFICADA
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
