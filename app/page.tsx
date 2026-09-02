import {
  evaluarRestricciones,
} from "../lib/motorRestricciones";

import type {
  EvaluacionRestricciones,
} from "../lib/motorRestricciones";

type Coordenadas = {
  lon: number;
  lat: number;
};

type GeometriaRuta = {
  type: "LineString";
  coordinates: [number, number][];
};

type ResultadoRuta = {
  distanciaKm: number;
  duracionMin: number;
  geometria: GeometriaRuta;
};

type PerfilVehiculo = {
  nombre: string;
  largo: number;
  ancho: number;
  altura: number;
  peso: number;
  ejes: number;
  consumo: number;
};

type EstadoRestriccion =
  | "COMPATIBLE"
  | "EXCEDE"
  | "NO_VERIFICADA";

type EvaluacionVehiculo = {
  estado: EstadoRestriccion;
  observaciones: string[];
};

const perfiles: Record<string, PerfilVehiculo> = {
  camion: {
    nombre: "Camión",
    largo: 12,
    ancho: 2.6,
    altura: 4.1,
    peso: 30,
    ejes: 3,
    consumo: 28,
  },

  camionAcoplado: {
    nombre: "Camión con acoplado",
    largo: 20,
    ancho: 2.6,
    altura: 4.1,
    peso: 45,
    ejes: 6,
    consumo: 32,
  },

  camionSemirremolque: {
    nombre: "Camión con semirremolque",
    largo: 18.5,
    ancho: 2.6,
    altura: 4.1,
    peso: 45,
    ejes: 5,
    consumo: 32,
  },

  bitren: {
    nombre: "Bitren",
    largo: 30,
    ancho: 2.6,
    altura: 4.3,
    peso: 75,
    ejes: 9,
    consumo: 35,
  },
};

export default function Home() {
  const [origen, setOrigen] = useState(
    "Campana, Buenos Aires, Argentina"
  );

  const [destino, setDestino] = useState(
    "Rosario, Santa Fe, Argentina"
  );

  const [vehiculo, setVehiculo] = useState(
    "camionSemirremolque"
  );

  const [consumo, setConsumo] = useState(32);

  const [precioGasoil, setPrecioGasoil] =
    useState(1500);

  const [resultado, setResultado] =
    useState<ResultadoRuta | null>(null);

  const [evaluacion, setEvaluacion] =
    useState<EvaluacionVehiculo | null>(null);

  const [
    evaluacionRestricciones,
    setEvaluacionRestricciones,
  ] = useState<EvaluacionRestricciones | null>(
    null
  );

  const [error, setError] = useState("");

  const [loading, setLoading] =
    useState(false);

  function cambiarVehiculo(valor: string) {
    setVehiculo(valor);

    const perfil = perfiles[valor];

    if (perfil) {
      setConsumo(perfil.consumo);
    }
  }

  async function buscarLugar(
    texto: string
  ): Promise<Coordenadas> {
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: texto,
        format: "jsonv2",
        limit: "1",
        countrycodes: "ar",
        "accept-language": "es",
      }).toString();

    const respuesta = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!respuesta.ok) {
      throw new Error(
        `No se pudo buscar el lugar. Código ${respuesta.status}.`
      );
    }

    const datos = await respuesta.json();

    const lugarEncontrado = datos?.[0];

    if (!lugarEncontrado) {
      throw new Error(
        `No se encontró la ubicación: ${texto}`
      );
    }

    const lat = Number(
      lugarEncontrado.lat
    );

    const lon = Number(
      lugarEncontrado.lon
    );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      throw new Error(
        `La ubicación encontrada no tiene coordenadas válidas: ${texto}`
      );
    }

    return {
      lat,
      lon,
    };
  }

  async function calcularRuta(
    origenCoord: Coordenadas,
    destinoCoord: Coordenadas
  ): Promise<ResultadoRuta> {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origenCoord.lon},${origenCoord.lat};` +
      `${destinoCoord.lon},${destinoCoord.lat}` +
      `?overview=full&geometries=geojson&steps=false`;

    const respuesta = await fetch(url);

    if (!respuesta.ok) {
      throw new Error(
        `El servicio de rutas respondió con error ${respuesta.status}.`
      );
    }

    const datos = await respuesta.json();

    if (
      datos?.code !== "Ok" ||
      !datos?.routes ||
      datos.routes.length === 0
    ) {
      throw new Error(
        "No se pudo calcular una ruta entre esos puntos."
      );
    }

    const ruta = datos.routes[0];

    if (
      !ruta.geometry ||
      ruta.geometry.type !== "LineString" ||
      !Array.isArray(
        ruta.geometry.coordinates
      ) ||
      ruta.geometry.coordinates.length < 2
    ) {
      throw new Error(
        "La ruta fue calculada, pero no se recibió su geometría."
      );
    }

    const coordenadasValidas:
      [number, number][] =
      ruta.geometry.coordinates
        .filter(
          (
            punto: unknown
          ): punto is [number, number] =>
            Array.isArray(punto) &&
            punto.length >= 2 &&
            Number.isFinite(
              Number(punto[0])
            ) &&
            Number.isFinite(
              Number(punto[1])
            )
        )
        .map((punto: [number, number]) => [
  Number(punto[0]),
  Number(punto[1]),
]);

    if (
      coordenadasValidas.length < 2
    ) {
      throw new Error(
        "La geometría recibida no contiene suficientes puntos válidos."
      );
    }

    return {
      distanciaKm:
        ruta.distance / 1000,

      duracionMin:
        ruta.duration / 60,

      geometria: {
        type: "LineString",
        coordinates:
          coordenadasValidas,
      },
    };
  }

  function evaluarVehiculo(): EvaluacionVehiculo {
    const perfil = perfiles[vehiculo];

    const observaciones: string[] =
      [];

    let estado: EstadoRestriccion =
      "COMPATIBLE";

    const limiteAncho = 2.6;

    const limiteAltura = 4.3;

    let limiteLargo = 0;

    switch (vehiculo) {
      case "camion":
        limiteLargo = 13.2;
        break;

      case "camionAcoplado":
        limiteLargo = 20.5;
        break;

      case "camionSemirremolque":
        limiteLargo = 19.3;
        break;

      case "bitren":
        limiteLargo = 30.25;
        break;

      default:
        limiteLargo = 20.5;
    }

    if (
      perfil.largo >
      limiteLargo
    ) {
      estado = "EXCEDE";

      observaciones.push(
        `El largo configurado (${perfil.largo.toFixed(
          2
        )} m) supera el límite general de referencia de ${limiteLargo.toFixed(
          2
        )} m para esta configuración.`
      );
    } else {
      observaciones.push(
        `Largo: ${perfil.largo.toFixed(
          2
        )} m / límite general: ${limiteLargo.toFixed(
          2
        )} m.`
      );
    }

    if (
      perfil.ancho >
      limiteAncho
    ) {
      estado = "EXCEDE";

      observaciones.push(
        `El ancho configurado (${perfil.ancho.toFixed(
          2
        )} m) supera el límite general de ${limiteAncho.toFixed(
          2
        )} m.`
      );
    } else {
      observaciones.push(
        `Ancho: ${perfil.ancho.toFixed(
          2
        )} m / límite general: ${limiteAncho.toFixed(
          2
        )} m.`
      );
    }

    if (
      perfil.altura >
      limiteAltura
    ) {
      estado = "EXCEDE";

      observaciones.push(
        `La altura configurada (${perfil.altura.toFixed(
          2
        )} m) supera el límite general de ${limiteAltura.toFixed(
          2
        )} m.`
      );
    } else {
      observaciones.push(
        `Altura: ${perfil.altura.toFixed(
          2
        )} m / límite general: ${limiteAltura.toFixed(
          2
        )} m.`
      );
    }

    if (perfil.peso > 45) {
      if (
        vehiculo !== "bitren"
      ) {
        estado = "EXCEDE";

        observaciones.push(
          `Peso bruto configurado: ${perfil.peso} t. Se requiere una configuración específica habilitada para superar 45 t.`
        );
      } else {
        observaciones.push(
          `Peso bruto configurado: ${perfil.peso} t. El bitren requiere verificación específica de configuración, ejes y tramo habilitado.`
        );
      }
    } else {
      observaciones.push(
        `Peso bruto configurado: ${perfil.peso} t.`
      );
    }

    if (
      estado === "COMPATIBLE"
    ) {
      estado = "NO_VERIFICADA";

      observaciones.push(
        "Las dimensiones generales son compatibles, pero todavía no se verificaron las restricciones específicas de la ruta."
      );
    }

    return {
      estado,
      observaciones,
    };
  }

  async function planificarRuta() {
    setError("");

    setResultado(null);

    setEvaluacion(null);

    setEvaluacionRestricciones(
      null
    );

    setLoading(true);

    try {
      if (!origen.trim()) {
        throw new Error(
          "Ingresá un lugar de origen."
        );
      }

      if (!destino.trim()) {
        throw new Error(
          "Ingresá un lugar de destino."
        );
      }

      if (
        !Number.isFinite(
          consumo
        ) ||
        consumo <= 0
      ) {
        throw new Error(
          "El consumo debe ser mayor que cero."
        );
      }

      if (
        !Number.isFinite(
          precioGasoil
        ) ||
        precioGasoil <= 0
      ) {
        throw new Error(
          "El precio del gasoil debe ser mayor que cero."
        );
      }

      const [
        origenCoord,
        destinoCoord,
      ] = await Promise.all([
        buscarLugar(origen),
        buscarLugar(destino),
      ]);

      const ruta =
        await calcularRuta(
          origenCoord,
          destinoCoord
        );

      const evaluacionVehiculo =
        evaluarVehiculo();

      const puntosRuta =
        ruta.geometria.coordinates.map(
          ([lon, lat]) => ({
            lat,
            lon,
          })
        );

      const evaluacionDeRestricciones =
        evaluarRestricciones(
          puntosRuta,
          vehiculo as
            | "camion"
            | "camionAcoplado"
            | "camionSemirremolque"
            | "bitren"
        );

      setResultado(ruta);

      setEvaluacion(
        evaluacionVehiculo
      );

      setEvaluacionRestricciones(
        evaluacionDeRestricciones
      );
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Ocurrió un error inesperado."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const perfilActual =
    perfiles[vehiculo];

  const distanciaIdaVuelta =
    resultado
      ? resultado.distanciaKm * 2
      : 0;

  const litrosEstimados =
    resultado
      ? (distanciaIdaVuelta *
          consumo) /
        100
      : 0;

  const costoEstimado =
    litrosEstimados *
    precioGasoil;

  const cantidadPuntosRuta =
    resultado?.geometria.coordinates
      .length ?? 0;

  function formatoNumero(
    numero: number
  ) {
    return new Intl.NumberFormat(
      "es-AR",
      {
        maximumFractionDigits: 1,
      }
    ).format(numero);
  }

  function formatoDinero(
    numero: number
  ) {
    return new Intl.NumberFormat(
      "es-AR",
      {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
      }
    ).format(numero);
  }

  function textoEstado(
    estado: EstadoRestriccion
  ) {
    if (
      estado === "COMPATIBLE"
    ) {
      return "🟢 COMPATIBLE";
    }

    if (
      estado === "EXCEDE"
    ) {
      return "🔴 EXCEDE LÍMITES";
    }

    return "⚪ RUTA NO VERIFICADA";
  }

  function colorEstado(
    estado: EstadoRestriccion
  ) {
    if (
      estado === "COMPATIBLE"
    ) {
      return "#dcfce7";
    }

    if (
      estado === "EXCEDE"
    ) {
      return "#fee2e2";
    }

    return "#f3f4f6";
  }

  function textoEstadoRestricciones(
    estado: string
  ) {
    if (
      estado === "VERIFICADA"
    ) {
      return "🟢 RESTRICCIONES VERIFICADAS";
    }

    if (
      estado === "CONDICIONAL"
    ) {
      return "🟡 RESTRICCIÓN CONDICIONAL";
    }

    if (
      estado === "INCOMPATIBLE"
    ) {
      return "🔴 INCOMPATIBLE";
    }

    return "⚪ INFORMACIÓN INSUFICIENTE";
  }

  function colorEstadoRestricciones(
    estado: string
  ) {
    if (
      estado === "VERIFICADA"
    ) {
      return "#dcfce7";
    }

    if (
      estado === "CONDICIONAL"
    ) {
      return "#fef3c7";
    }

    if (
      estado === "INCOMPATIBLE"
    ) {
      return "#fee2e2";
    }

    return "#f3f4f6";
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding:
          "24px 16px 60px",
        color: "#172033",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <header
          style={{
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontSize: 32,
              margin: 0,
              fontWeight: 800,
            }}
          >
            🚛 Camionero AR
          </h1>

          <p
            style={{
              marginTop: 8,
              color: "#526071",
              fontSize: 16,
            }}
          >
            Planificación de transporte
            pesado en Argentina
          </p>
        </header>

        <section
          style={{
            background: "white",
            borderRadius: 18,
            padding: 20,
            boxShadow:
              "0 8px 30px rgba(20,30,50,0.08)",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: 22,
            }}
          >
            📍 Planificar ruta
          </h2>

          <label
            style={{
              display: "block",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Origen
          </label>

          <input
            value={origen}
            onChange={(e) =>
              setOrigen(
                e.target.value
              )
            }
            placeholder="Ej.: Campana, Buenos Aires"
            style={inputStyle}
          />

          <label
            style={{
              display: "block",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Destino
          </label>

          <input
            value={destino}
            onChange={(e) =>
              setDestino(
                e.target.value
              )
            }
            placeholder="Ej.: Rosario, Santa Fe"
            style={inputStyle}
          />

          <label
            style={{
              display: "block",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Tipo de vehículo
          </label>

          <select
            value={vehiculo}
            onChange={(e) =>
              cambiarVehiculo(
                e.target.value
              )
            }
            style={inputStyle}
          >
            <option value="camion">
              Camión
            </option>

            <option value="camionAcoplado">
              Camión con acoplado
            </option>

            <option value="camionSemirremolque">
              Camión con semirremolque
            </option>

            <option value="bitren">
              Bitren
            </option>
          </select>

          <div
            style={{
              background: "#f3f6fa",
              borderRadius: 14,
              padding: 16,
              marginTop: 12,
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 12,
              }}
            >
              🚛 Perfil del vehículo
            </h3>

            <div style={gridStyle}>
              <div>
                <strong>Largo</strong>
                <br />
                {perfilActual.largo} m
              </div>

              <div>
                <strong>Ancho</strong>
                <br />
                {perfilActual.ancho} m
              </div>

              <div>
                <strong>Altura</strong>
                <br />
                {perfilActual.altura} m
              </div>

              <div>
                <strong>Peso</strong>
                <br />
                {perfilActual.peso} t
              </div>

              <div>
                <strong>Ejes</strong>
                <br />
                {perfilActual.ejes}
              </div>

              <div>
                <strong>Consumo sugerido</strong>
                <br />
                {perfilActual.consumo} L/100 km
              </div>
            </div>
          </div>

          <label
            style={{
              display: "block",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Consumo del vehículo
          </label>

          <input
            type="number"
            min="1"
            step="0.1"
            value={consumo}
            onChange={(e) =>
              setConsumo(
                Number(
                  e.target.value
                )
              )
            }
            style={inputStyle}
          />

          <label
            style={{
              display: "block",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Precio del gasoil
          </label>

          <input
            type="number"
            min="1"
            step="1"
            value={precioGasoil}
            onChange={(e) =>
              setPrecioGasoil(
                Number(
                  e.target.value
                )
              )
            }
            style={inputStyle}
          />

          <button
            onClick={
              planificarRuta
            }
            disabled={loading}
            style={{
              width: "100%",
              border: 0,
              borderRadius: 14,
              padding: "16px",
              background: loading
                ? "#9ca3af"
                : "#172033",
              color: "white",
              fontSize: 18,
              fontWeight: 800,
              cursor: loading
                ? "default"
                : "pointer",
              marginTop: 8,
            }}
          >
            {loading
              ? "Calculando ruta..."
              : "Planificar ruta"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: "#fee2e2",
                border:
                  "1px solid #fecaca",
                borderRadius: 14,
                color: "#991b1b",
                fontWeight: 600,
              }}
            >
              ⚠️ {error}
            </div>
          )}
        </section>

        {resultado && (
          <section
            style={{
              background: "#eef6ff",
              border:
                "1px solid #c9ddf5",
              borderRadius: 20,
              padding:
                "28px 20px",
              marginBottom: 20,
            }}
          >
            <h2
              style={{
                fontSize: 28,
                marginTop: 0,
                marginBottom: 24,
              }}
            >
              📍 Resultado de la ruta
            </h2>

            <div
              style={{
                fontSize: 18,
                lineHeight: 1.55,
              }}
            >
              <p>
                <strong>
                  Origen:
                </strong>{" "}
                {origen}
              </p>

              <p>
                <strong>
                  Destino:
                </strong>{" "}
                {destino}
              </p>

              <p>
                <strong>
                  Vehículo:
                </strong>{" "}
                {perfilActual.nombre}
              </p>

              <p>
                <strong>
                  Distancia:
                </strong>{" "}
                {formatoNumero(
                  resultado.distanciaKm
                )}{" "}
                km
              </p>

              <p>
                <strong>
                  Duración:
                </strong>{" "}
                {Math.floor(
                  resultado.duracionMin /
                    60
                )}{" "}
                h{" "}
                {Math.round(
                  resultado.duracionMin %
                    60
                )}{" "}
                min
              </p>
            </div>

            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: "#e0f2fe",
                border:
                  "1px solid #bae6fd",
                borderRadius: 14,
              }}
            >
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                }}
              >
                🛣️ Geometría de la ruta
              </div>

              <p
                style={{
                  marginBottom: 0,
                  lineHeight: 1.5,
                }}
              >
                Recorrido completo
                capturado
                correctamente.
                <br />
                Puntos de la ruta:{" "}
                <strong>
                  {
                    cantidadPuntosRuta
                  }
                </strong>
              </p>

              <p
                style={{
                  marginBottom: 0,
                  color: "#475569",
                  fontSize: 14,
                }}
              >
                La geometría queda
                preparada para el
                mapa y para el
                análisis de
                restricciones.
              </p>
            </div>

            <hr
              style={{
                border: 0,
                borderTop:
                  "1px solid #cbd9e8",
                margin:
                  "24px 0",
              }}
            />

            <h2
              style={{
                fontSize: 27,
                marginBottom: 20,
              }}
            >
              ⛽ Estimación de
              combustible
            </h2>

            <div
              style={{
                fontSize: 18,
                lineHeight: 1.6,
              }}
            >
              <p>
                <strong>
                  Distancia ida y
                  vuelta:
                </strong>{" "}
                {formatoNumero(
                  distanciaIdaVuelta
                )}{" "}
                km
              </p>

              <p>
                <strong>
                  Consumo:
                </strong>{" "}
                {formatoNumero(
                  consumo
                )}{" "}
                L/100 km
              </p>

              <p>
                <strong>
                  Litros estimados:
                </strong>{" "}
                {formatoNumero(
                  litrosEstimados
                )}{" "}
                L
              </p>

              <p>
                <strong>
                  Precio gasoil:
                </strong>{" "}
                {formatoDinero(
                  precioGasoil
                )}{" "}
                / L
              </p>
            </div>

            <div
              style={{
                background: "white",
                borderRadius: 16,
                padding: 20,
                marginTop: 20,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                💰 Costo estimado:
              </div>

              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  marginTop: 4,
                }}
              >
                {formatoDinero(
                  costoEstimado
                )}
              </div>
            </div>

            {evaluacion && (
              <div
                style={{
                  marginTop: 22,
                  background:
                    colorEstado(
                      evaluacion.estado
                    ),
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    fontSize: 23,
                  }}
                >
                  ⚖️ Evaluación del
                  vehículo
                </h2>

                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    marginBottom: 16,
                  }}
                >
                  {textoEstado(
                    evaluacion.estado
                  )}
                </div>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 22,
                    lineHeight: 1.6,
                  }}
                >
                  {evaluacion.observaciones.map(
                    (
                      observacion,
                      index
                    ) => (
                      <li
                        key={index}
                      >
                        {observacion}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {evaluacionRestricciones && (
              <div
                style={{
                  marginTop: 22,
                  background:
                    colorEstadoRestricciones(
                      evaluacionRestricciones.estadoGeneral
                    ),
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    fontSize: 23,
                  }}
                >
                  🛣️ Restricciones
                  de la ruta
                </h2>

                <div
                  style={{
                    fontSize: 21,
                    fontWeight: 900,
                    marginBottom: 16,
                  }}
                >
                  {textoEstadoRestricciones(
                    evaluacionRestricciones.estadoGeneral
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      background:
                        "rgba(255,255,255,0.7)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <strong>
                      Verificadas
                    </strong>
                    <br />
                    {
                      evaluacionRestricciones.cantidadVerificadas
                    }
                  </div>

                  <div
                    style={{
                      background:
                        "rgba(255,255,255,0.7)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <strong>
                      Condicionales
                    </strong>
                    <br />
                    {
                      evaluacionRestricciones.cantidadCondicionales
                    }
                  </div>

                  <div
                    style={{
                      background:
                        "rgba(255,255,255,0.7)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <strong>
                      Incompatibles
                    </strong>
                    <br />
                    {
                      evaluacionRestricciones.cantidadIncompatibles
                    }
                  </div>

                  <div
                    style={{
                      background:
                        "rgba(255,255,255,0.7)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <strong>
                      Desconocidas
                    </strong>
                    <br />
                    {
                      evaluacionRestricciones.cantidadDesconocidas
                    }
                  </div>
                </div>

                {evaluacionRestricciones
                  .resultados.length ===
                0 ? (
                  <div
                    style={{
                      background:
                        "rgba(255,255,255,0.7)",
                      borderRadius: 12,
                      padding: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    No se detectaron
                    restricciones
                    registradas cerca
                    de la geometría de
                    esta ruta.
                    <br />
                    <strong>
                      Esto no significa
                      que la ruta esté
                      legalmente
                      verificada.
                    </strong>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    {evaluacionRestricciones.resultados.map(
                      (
                        resultadoRestriccion
                      ) => (
                        <div
                          key={
                            resultadoRestriccion
                              .restriccion
                              .id
                          }
                          style={{
                            background:
                              "rgba(255,255,255,0.8)",
                            borderRadius: 14,
                            padding: 15,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: 17,
                            }}
                          >
                            {
                              resultadoRestriccion
                                .restriccion
                                .nombre
                            }
                          </div>

                          <div
                            style={{
                              marginTop: 6,
                              fontWeight: 700,
                            }}
                          >
                            Estado:{" "}
                            {
                              resultadoRestriccion.estado
                            }
                          </div>

                          {resultadoRestriccion.distanciaAproxKm !==
                            undefined && (
                            <div
                              style={{
                                marginTop: 5,
                                fontSize: 14,
                              }}
                            >
                              Distancia
                              aproximada:
                              {" "}
                              {
                                resultadoRestriccion.distanciaAproxKm
                              }{" "}
                              km
                            </div>
                          )}

                          <p
                            style={{
                              marginBottom: 0,
                              lineHeight: 1.5,
                            }}
                          >
                            {
                              resultadoRestriccion.motivo
                            }
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: 20,
                background: "#fffbea",
                border:
                  "1px solid #f5df86",
                borderRadius: 16,
                padding: 18,
                color: "#7c4a03",
                lineHeight: 1.55,
              }}
            >
              <strong>
                ⚠️ Importante
              </strong>

              <p>
                La ruta se calcula
                mediante un servicio
                vial general y su
                geometría se cruza con
                la base de restricciones
                disponible.
              </p>

              <p>
                La ausencia de una
                restricción detectada
                no constituye por sí
                sola autorización legal
                para circular.
              </p>

              <p
                style={{
                  marginBottom: 0,
                  fontWeight: 700,
                }}
              >
                Camionero AR debe
                utilizar información
                oficial y actualizada
                antes de presentar una
                ruta como habilitada.
              </p>
            </div>
          </section>
        )}

        <footer
          style={{
            textAlign: "center",
            color: "#6b7280",
            fontSize: 14,
            paddingTop: 10,
          }}
        >
          Camionero AR · Planificación
          de transporte pesado en
          Argentina
        </footer>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties =
  {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    borderRadius: 12,
    border:
      "1px solid #d5dce5",
    marginBottom: 16,
    fontSize: 16,
    background: "white",
  };

const gridStyle: React.CSSProperties =
  {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 12,
    lineHeight: 1.5,
  };
