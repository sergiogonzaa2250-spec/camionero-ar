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

/**
 * Distancia aproximada entre dos coordenadas geográficas.
 */
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

/**
 * Convierte coordenadas geográficas a una aproximación
 * plana local en kilómetros.
 *
 * Se utiliza solamente para calcular distancias pequeñas
 * entre una ruta y una restricción.
 */
function proyectarKm(
  punto: PuntoRuta,
  latitudReferencia: number
): {
  x: number;
  y: number;
} {
  const radioTierraKm = 6371;

  const lat =
    (punto.lat * Math.PI) / 180;

  const lon =
    (punto.lon * Math.PI) / 180;

  const latRef =
    (latitudReferencia * Math.PI) / 180;

  return {
    x:
      radioTierraKm *
      lon *
      Math.cos(latRef),

    y:
      radioTierraKm * lat,
  };
}

/**
 * Calcula la distancia mínima entre un punto
 * y un segmento de la ruta.
 */
function distanciaPuntoSegmentoKm(
  punto: PuntoRuta,
  inicioSegmento: PuntoRuta,
  finSegmento: PuntoRuta
): number {
  const latitudReferencia =
    (punto.lat +
      inicioSegmento.lat +
      finSegmento.lat) /
    3;

  const p = proyectarKm(
    punto,
    latitudReferencia
  );

  const a = proyectarKm(
    inicioSegmento,
    latitudReferencia
  );

  const b = proyectarKm(
    finSegmento,
    latitudReferencia
  );

  const abX = b.x - a.x;
  const abY = b.y - a.y;

  const apX = p.x - a.x;
  const apY = p.y - a.y;

  const longitudAB2 =
    abX * abX + abY * abY;

  if (longitudAB2 === 0) {
    return Math.sqrt(
      apX * apX + apY * apY
    );
  }

  let t =
    (apX * abX +
      apY * abY) /
    longitudAB2;

  t = Math.max(
    0,
    Math.min(1, t)
  );

  const puntoCercanoX =
    a.x + t * abX;

  const puntoCercanoY =
    a.y + t * abY;

  const dx =
    p.x - puntoCercanoX;

  const dy =
    p.y - puntoCercanoY;

  return Math.sqrt(
    dx * dx + dy * dy
  );
}

/**
 * Calcula la distancia mínima entre una restricción
 * puntual y toda la geometría de la ruta.
 *
 * A diferencia de una comparación solamente entre
 * vértices, analiza todos los segmentos de la línea.
 */
function distanciaRutaAPunto(
  ruta: PuntoRuta[],
  punto: PuntoRestriccion
): number | undefined {
  if (ruta.length === 0) {
    return undefined;
  }

  if (ruta.length === 1) {
    return distanciaKm(
      ruta[0],
      {
        lat: punto.lat,
        lon: punto.lon,
      }
    );
  }

  const puntoRestriccion: PuntoRuta = {
    lat: punto.lat,
    lon: punto.lon,
  };

  let menorDistancia = Infinity;

  for (
    let i = 0;
    i < ruta.length - 1;
    i++
  ) {
    const distancia =
      distanciaPuntoSegmentoKm(
        puntoRestriccion,
        ruta[i],
        ruta[i + 1]
      );

    if (
      distancia < menorDistancia
    ) {
      menorDistancia = distancia;
    }
  }

  if (
    !Number.isFinite(
      menorDistancia
    )
  ) {
    return undefined;
  }

  return menorDistancia;
}

/**
 * Busca el punto de restricción más cercano
 * a la geometría completa de la ruta.
 */
function buscarPuntoMasCercano(
  ruta: PuntoRuta[],
  puntos: PuntoRestriccion[]
):
  | {
      distancia: number;
      punto: PuntoRestriccion;
    }
  | undefined {
  let mejorResultado:
    | {
        distancia: number;
        punto: PuntoRestriccion;
      }
    | undefined;

  for (const punto of puntos) {
    const distancia =
      distanciaRutaAPunto(
        ruta,
        punto
      );

    if (
      distancia === undefined
    ) {
      continue;
    }

    if (
      mejorResultado ===
        undefined ||
      distancia <
        mejorResultado.distancia
    ) {
      mejorResultado = {
        distancia,
        punto,
      };
    }
  }

  return mejorResultado;
}

/**
 * Determina si la restricción aplica
 * al tipo de vehículo seleccionado.
 */
function aplicaAVehiculo(
  restriccion: Restriccion,
  vehiculo: TipoVehiculo
): boolean {
  if (
    !restriccion.vehiculos
  ) {
    return true;
  }

  return restriccion.vehiculos.includes(
    vehiculo
  );
}

/**
 * Evalúa una restricción individual.
 *
 * Importante:
 * La cercanía geográfica NO significa automáticamente
 * que exista una prohibición ni una autorización.
 *
 * El motor solamente detecta una posible coincidencia
 * con la base de restricciones.
 */
function evaluarUnaRestriccion(
  ruta: PuntoRuta[],
  restriccion: Restriccion,
  radioBusquedaKm: number
):
  | ResultadoRestriccion
  | undefined {
  /**
   * Si la restricción todavía no tiene
   * coordenadas registradas, no podemos
   * determinar si la ruta la atraviesa.
   */
  if (
    !restriccion.puntos ||
    restriccion.puntos.length === 0
  ) {
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

  if (
    !puntoMasCercano
  ) {
    return {
      restriccion,
      estado: "DESCONOCIDA",
      motivo:
        "No fue posible calcular la distancia entre la geometría de la ruta y los puntos registrados de la restricción.",
    };
  }

  /**
   * Radio de búsqueda preliminar.
   *
   * Esto NO representa una intersección legal.
   * Solamente determina si debemos mostrar
   * la restricción para revisión.
   */
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
    restriccion.estado ===
    "CONDICIONAL"
  ) {
    motivo =
      "La ruta pasa cerca de una restricción condicional. Deben verificarse las condiciones específicas antes de autorizar la circulación.";
  }

  if (
    restriccion.estado ===
    "INCOMPATIBLE"
  ) {
    motivo =
      "La ruta pasa cerca de una restricción marcada como incompatible con la configuración analizada.";
  }

  if (
    restriccion.estado ===
    "VERIFICADA"
  ) {
    motivo =
      "La ruta pasa cerca de una restricción verificada registrada en la base.";
  }

  return {
    restriccion,
    estado:
      restriccion.estado,
    motivo,
    distanciaAproxKm:
      distanciaRedondeada,
    puntoDetectado:
      puntoMasCercano.punto,
  };
}

/**
 * Evalúa todas las restricciones aplicables
 * a una ruta y vehículo determinados.
 */
export function evaluarRestricciones(
  ruta: PuntoRuta[],
  vehiculo: TipoVehiculo,
  radioBusquedaKm: number = 1
): EvaluacionRestricciones {
  const resultados:
    ResultadoRestriccion[] =
    [];

  if (ruta.length === 0) {
    return {
      estadoGeneral:
        "DESCONOCIDA",
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
      resultados.push(
        resultado
      );
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

  /**
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
  let estadoGeneral:
    EstadoRestriccion =
    "DESCONOCIDA";

  if (
    cantidadIncompatibles > 0
  ) {
    estadoGeneral =
      "INCOMPATIBLE";
  } else if (
    cantidadCondicionales > 0
  ) {
    estadoGeneral =
      "CONDICIONAL";
  } else if (
    cantidadDesconocidas > 0
  ) {
    estadoGeneral =
      "DESCONOCIDA";
  } else if (
    cantidadVerificadas > 0
  ) {
    estadoGeneral =
      "VERIFICADA";
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
