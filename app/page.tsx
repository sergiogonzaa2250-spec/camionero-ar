"use client";

import { useState } from "react";

type ResultadoRuta = {
  origen: string;
  destino: string;
  vehiculo: string;
  distanciaKm: number;
  duracionMinutos: number;
};

type Coordenadas = {
  lon: number;
  lat: number;
};

type PerfilVehiculo = {
  largo: string;
  ancho: string;
  altura: string;
  peso: string;
  ejes: string;
  consumo: number;
};

const perfiles: Record<string, PerfilVehiculo> = {
  Camión: {
    largo: "12 m",
    ancho: "2.6 m",
    altura: "4.1 m",
    peso: "30 t",
    ejes: "3",
    consumo: 28,
  },

  "Camión con acoplado": {
    largo: "20 m",
    ancho: "2.6 m",
    altura: "4.1 m",
    peso: "45 t",
    ejes: "6",
    consumo: 32,
  },

  "Camión con semirremolque": {
    largo: "18.5 m",
    ancho: "2.6 m",
    altura: "4.1 m",
    peso: "45 t",
    ejes: "5",
    consumo: 32,
  },

  Bitren: {
    largo: "30 m",
    ancho: "2.6 m",
    altura: "4.3 m",
    peso: "75 t",
    ejes: "9",
    consumo: 35,
  },
};

export default function CamioneroAR() {
  const [origen, setOrigen] = useState(
    "Campana, Buenos Aires, Argentina"
  );

  const [destino, setDestino] = useState(
    "Rosario, Santa Fe, Argentina"
  );

  const [vehiculo, setVehiculo] = useState(
    "Camión con semirremolque"
  );

  const [consumo, setConsumo] = useState(32);

  const [precioGasoil, setPrecioGasoil] = useState(1500);

  const [resultado, setResultado] =
    useState<ResultadoRuta | null>(null);

  const [error, setError] = useState("");

  const [cargando, setCargando] = useState(false);

  function cambiarVehiculo(nuevoVehiculo: string) {
    setVehiculo(nuevoVehiculo);

    const perfil = perfiles[nuevoVehiculo];

    if (perfil) {
      setConsumo(perfil.consumo);
    }
  }

  async function buscarLugar(
    lugar: string
  ): Promise<Coordenadas> {
    const texto = lugar.trim();

    if (!texto) {
      throw new Error("Ingresá una ubicación.");
    }

    const url =
      "https://photon.komoot.io/api/?" +
      new URLSearchParams({
        q: texto,
        limit: "1",
        lang: "es",
      }).toString();

    let respuesta: Response;

    try {
      respuesta = await fetch(url);
    } catch {
      throw new Error(
        "No se pudo conectar con el servicio de mapas."
      );
    }

    if (!respuesta.ok) {
      throw new Error(
        `El servicio de mapas respondió con error (${respuesta.status}).`
      );
    }

    const datos = await respuesta.json();

    const caracteristica = datos?.features?.[0];

    if (!caracteristica) {
      throw new Error(
        `No se encontró "${texto}". Probá agregando ciudad y provincia.`
      );
    }

    const coordenadas =
      caracteristica?.geometry?.coordinates;

    if (
      !Array.isArray(coordenadas) ||
      coordenadas.length < 2 ||
      !Number.isFinite(Number(coordenadas[0])) ||
      !Number.isFinite(Number(coordenadas[1]))
    ) {
      throw new Error(
        `No se pudieron obtener las coordenadas de "${texto}".`
      );
    }

    return {
      lon: Number(coordenadas[0]),
      lat: Number(coordenadas[1]),
    };
  }

  async function calcularRuta(
    origenCoords: Coordenadas,
    destinoCoords: Coordenadas
  ) {
    if (
      !Number.isFinite(origenCoords.lon) ||
      !Number.isFinite(origenCoords.lat) ||
      !Number.isFinite(destinoCoords.lon) ||
      !Number.isFinite(destinoCoords.lat)
    ) {
      throw new Error(
        "Las coordenadas obtenidas no son válidas."
      );
    }

    const coordenadasRuta =
      `${origenCoords.lon},${origenCoords.lat};` +
      `${destinoCoords.lon},${destinoCoords.lat}`;

    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordenadasRuta}` +
      `?overview=false&steps=false`;

    let respuesta: Response;

    try {
      respuesta = await fetch(url);
    } catch {
      throw new Error(
        "No se pudo conectar con el servicio de rutas."
      );
    }

    if (!respuesta.ok) {
      throw new Error(
        `El servicio de rutas respondió con error (${respuesta.status}).`
      );
    }

    const datos = await respuesta.json();

    if (datos?.code !== "Ok") {
      throw new Error(
        datos?.message ||
          "El servicio de rutas no encontró un recorrido."
      );
    }

    const ruta = datos?.routes?.[0];

    if (!ruta) {
      throw new Error(
        "No se encontró una ruta entre los lugares."
      );
    }

    if (
      !Number.isFinite(Number(ruta.distance)) ||
      !Number.isFinite(Number(ruta.duration))
    ) {
      throw new Error(
        "La ruta recibida no contiene distancia o duración válidas."
      );
    }

    return {
      distanciaKm:
        Math.round(
          (Number(ruta.distance) / 1000) * 10
        ) / 10,

      duracionMinutos:
        Math.round(Number(ruta.duration) / 60),
    };
  }

  async function planificarRuta() {
    if (!origen.trim()) {
      setError("Completá el origen.");
      setResultado(null);
      return;
    }

    if (!destino.trim()) {
      setError("Completá el destino.");
      setResultado(null);
      return;
    }

    if (!Number.isFinite(consumo) || consumo <= 0) {
      setError(
        "El consumo debe ser mayor que 0 L/100 km."
      );
      setResultado(null);
      return;
    }

    if (
      !Number.isFinite(precioGasoil) ||
      precioGasoil <= 0
    ) {
      setError(
        "Ingresá un precio de gasoil válido."
      );
      setResultado(null);
      return;
    }

    setCargando(true);
    setError("");
    setResultado(null);

    try {
      const [origenCoords, destinoCoords] =
        await Promise.all([
          buscarLugar(origen),
          buscarLugar(destino),
        ]);

      const ruta = await calcularRuta(
        origenCoords,
        destinoCoords
      );

      setResultado({
        origen,
        destino,
        vehiculo,
        distanciaKm: ruta.distanciaKm,
        duracionMinutos: ruta.duracionMinutos,
      });
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(
          "Ocurrió un error al calcular la ruta."
        );
      }
    } finally {
      setCargando(false);
    }
  }

  function formatoDuracion(minutos: number) {
    const horas = Math.floor(minutos / 60);

    const minutosRestantes = minutos % 60;

    if (horas === 0) {
      return `${minutosRestantes} min`;
    }

    if (minutosRestantes === 0) {
      return `${horas} h`;
    }

    return `${horas} h ${minutosRestantes} min`;
  }

  function formatoNumero(numero: number) {
    return new Intl.NumberFormat("es-AR", {
      maximumFractionDigits: 1,
    }).format(numero);
  }

  function formatoPesos(numero: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(numero);
  }

  const perfilActual = perfiles[vehiculo];

  const distanciaIdaVuelta = resultado
    ? resultado.distanciaKm * 2
    : 0;

  const litrosEstimados =
    resultado && consumo > 0
      ? (distanciaIdaVuelta * consumo) / 100
      : 0;

  const costoEstimado =
    litrosEstimados * precioGasoil;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: "20px",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "28px",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            margin: "0 0 10px",
            fontSize: "36px",
            color: "#172033",
          }}
        >
          🚚 Camionero AR
        </h1>

        <p
          style={{
            fontSize: "18px",
            lineHeight: 1.6,
            color: "#374151",
            marginBottom: "25px",
          }}
        >
          Planificador de rutas para transporte
          pesado en Argentina.
        </p>

        <hr
          style={{
            border: 0,
            borderTop:
              "1px solid #e5e7eb",
            marginBottom: "25px",
          }}
        />

        <h2
          style={{
            fontSize: "28px",
            color: "#172033",
            marginBottom: "25px",
          }}
        >
          Planificar viaje
        </h2>

        <label
          htmlFor="origen"
          style={{
            display: "block",
            fontWeight: "bold",
            fontSize: "18px",
            marginBottom: "8px",
            color: "#172033",
          }}
        >
          Origen
        </label>

        <input
          id="origen"
          type="text"
          placeholder="Ej.: Campana, Buenos Aires"
          value={origen}
          onChange={(e) =>
            setOrigen(e.target.value)
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "16px",
            borderRadius: "12px",
            border:
              "1px solid #cbd5e1",
            fontSize: "17px",
            marginBottom: "20px",
          }}
        />

        <label
          htmlFor="destino"
          style={{
            display: "block",
            fontWeight: "bold",
            fontSize: "18px",
            marginBottom: "8px",
            color: "#172033",
          }}
        >
          Destino
        </label>

        <input
          id="destino"
          type="text"
          placeholder="Ej.: Rosario, Santa Fe"
          value={destino}
          onChange={(e) =>
            setDestino(e.target.value)
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "16px",
            borderRadius: "12px",
            border:
              "1px solid #cbd5e1",
            fontSize: "17px",
            marginBottom: "20px",
          }}
        />

        <label
          htmlFor="vehiculo"
          style={{
            display: "block",
            fontWeight: "bold",
            fontSize: "18px",
            marginBottom: "8px",
            color: "#172033",
          }}
        >
          Tipo de vehículo
        </label>

        <select
          id="vehiculo"
          value={vehiculo}
          onChange={(e) =>
            cambiarVehiculo(e.target.value)
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "16px",
            borderRadius: "12px",
            border:
              "1px solid #cbd5e1",
            fontSize: "17px",
            marginBottom: "20px",
            background: "#ffffff",
          }}
        >
          <option>Camión</option>

          <option>
            Camión con acoplado
          </option>

          <option>
            Camión con semirremolque
          </option>

          <option>Bitren</option>
        </select>

        {perfilActual && (
          <div
            style={{
              marginBottom: "25px",
              padding: "20px",
              borderRadius: "18px",
              background: "#f8fafc",
              border:
                "1px solid #e2e8f0",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#172033",
                fontSize: "22px",
              }}
            >
              🚛 Perfil del vehículo
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "16px",
              }}
            >
              <div>
                <strong>Largo</strong>
                <br />
                {perfilActual.largo}
              </div>

              <div>
                <strong>Ancho</strong>
                <br />
                {perfilActual.ancho}
              </div>

              <div>
                <strong>Altura</strong>
                <br />
                {perfilActual.altura}
              </div>

              <div>
                <strong>Peso</strong>
                <br />
                {perfilActual.peso}
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
        )}

        <label
          htmlFor="consumo"
          style={{
            display: "block",
            fontWeight: "bold",
            fontSize: "18px",
            marginBottom: "8px",
            color: "#172033",
          }}
        >
          Consumo del vehículo
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <input
            id="consumo"
            type="number"
            min="1"
            step="0.1"
            value={consumo}
            onChange={(e) =>
              setConsumo(
                Number(e.target.value)
              )
            }
            style={{
              flex: 1,
              boxSizing: "border-box",
              padding: "16px",
              borderRadius: "12px",
              border:
                "1px solid #cbd5e1",
              fontSize: "17px",
            }}
          />

          <span
            style={{
              fontWeight: "bold",
              color: "#374151",
            }}
          >
            L/100 km
          </span>
        </div>

        <label
          htmlFor="precio"
          style={{
            display: "block",
            fontWeight: "bold",
            fontSize: "18px",
            marginBottom: "8px",
            color: "#172033",
          }}
        >
          Precio del gasoil
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "25px",
          }}
        >
          <span
            style={{
              fontWeight: "bold",
              fontSize: "20px",
            }}
          >
            $
          </span>

          <input
            id="precio"
            type="number"
            min="1"
            step="1"
            value={precioGasoil}
            onChange={(e) =>
              setPrecioGasoil(
                Number(e.target.value)
              )
            }
            style={{
              flex: 1,
              boxSizing: "border-box",
              padding: "16px",
              borderRadius: "12px",
              border:
                "1px solid #cbd5e1",
              fontSize: "17px",
            }}
          />

          <span
            style={{
              fontWeight: "bold",
              color: "#374151",
            }}
          >
            por litro
          </span>
        </div>

        <button
          onClick={planificarRuta}
          disabled={cargando}
          style={{
            width: "100%",
            padding: "18px",
            border: "none",
            borderRadius: "12px",
            background: cargando
              ? "#64748b"
              : "#30384d",
            color: "#ffffff",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: cargando
              ? "wait"
              : "pointer",
          }}
        >
          {cargando
            ? "⏳ Calculando..."
            : "🗺️ Planificar ruta"}
        </button>

        {error && (
          <div
            style={{
              marginTop: "25px",
              padding: "20px",
              borderRadius: "18px",
              background: "#fff7ed",
              border:
                "1px solid #fed7aa",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#9a3412",
                fontSize: "22px",
              }}
            >
              ⚠️ Atención
            </h3>

            <p
              style={{
                marginBottom: 0,
                color: "#7c2d12",
                fontSize: "17px",
                lineHeight: 1.5,
              }}
            >
              {error}
            </p>
          </div>
        )}

        {resultado && (
          <>
            <div
              style={{
                marginTop: "25px",
                padding: "22px",
                borderRadius: "18px",
                background: "#f8fafc",
                border:
                  "1px solid #e2e8f0",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: "#172033",
                  fontSize: "22px",
                }}
              >
                📍 Resultado de la ruta
              </h3>

              <p>
                <strong>Origen:</strong>{" "}
                {resultado.origen}
              </p>

              <p>
                <strong>Destino:</strong>{" "}
                {resultado.destino}
              </p>

              <p>
                <strong>Vehículo:</strong>{" "}
                {resultado.vehiculo}
              </p>

              <p>
                <strong>Distancia de ida:</strong>{" "}
                {formatoNumero(
                  resultado.distanciaKm
                )}{" "}
                km
              </p>

              <p>
                <strong>Distancia ida y vuelta:</strong>{" "}
                {formatoNumero(
                  distanciaIdaVuelta
                )}{" "}
                km
              </p>

              <p>
                <strong>Duración estimada de ida:</strong>{" "}
                {formatoDuracion(
                  resultado.duracionMinutos
                )}
              </p>
            </div>

            <div
              style={{
                marginTop: "25px",
                padding: "24px",
                borderRadius: "18px",
                background: "#ecfdf5",
                border:
                  "1px solid #a7f3d0",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: "#065f46",
                  fontSize: "24px",
                }}
              >
                ⛽ Estimación de combustible
              </h3>

              <p
                style={{
                  fontSize: "18px",
                  color: "#064e3b",
                }}
              >
                <strong>
                  Distancia calculada:
                </strong>{" "}
                {formatoNumero(
                  distanciaIdaVuelta
                )}{" "}
                km
              </p>

              <p
                style={{
                  fontSize: "18px",
                  color: "#064e3b",
                }}
              >
                <strong>Consumo:</strong>{" "}
                {formatoNumero(consumo)} L/100 km
              </p>

              <p
                style={{
                  fontSize: "18px",
                  color: "#064e3b",
                }}
              >
                <strong>
                  Litros estimados:
                </strong>{" "}
                {formatoNumero(
                  litrosEstimados
                )}{" "}
                L
              </p>

              <p
                style={{
                  fontSize: "18px",
                  color: "#064e3b",
                }}
              >
                <strong>
                  Precio del gasoil:
                </strong>{" "}
                {formatoPesos(
                  precioGasoil
                )}{" "}
                / L
              </p>

              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "20px",
                  borderTop:
                    "1px solid #a7f3d0",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    color: "#065f46",
                    marginBottom: "6px",
                  }}
                >
                  💰 <strong>
                    Costo estimado:
                  </strong>
                </div>

                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#047857",
                  }}
                >
                  {formatoPesos(
                    costoEstimado
                  )}
                </div>
              </div>

              <p
                style={{
                  marginBottom: 0,
                  marginTop: "20px",
                  fontSize: "14px",
                  lineHeight: 1.5,
                  color: "#065f46",
                }}
              >
                El cálculo utiliza la distancia
                de ida y vuelta, el consumo
                ingresado y el precio del
                combustible indicado. Es una
                estimación matemática y no
                contempla desvíos, ralentí,
                tráfico, carga, pendientes ni
                otras condiciones reales de
                operación.
              </p>
            </div>

            <div
              style={{
                marginTop: "25px",
                padding: "20px",
                borderRadius: "18px",
                background: "#fff7ed",
                border:
                  "1px solid #fed7aa",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#7c2d12",
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                ⚠️ <strong>Importante:</strong>{" "}
                la ruta calculada actualmente
                utiliza un motor vial general.
                El perfil del vehículo se utiliza
                para los cálculos y como referencia,
                pero todavía no modifica
                automáticamente el trazado.

                <br />
                <br />

                Esta versión todavía no verifica
                restricciones específicas para
                transporte pesado, peso por eje,
                altura máxima, puentes, peajes,
                tránsito, permisos ni
                restricciones legales.
              </p>
            </div>
          </>
        )}

        <p
          style={{
            marginTop: "30px",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "14px",
          }}
        >
          Camionero AR · versión de desarrollo
        </p>
      </div>
    </main>
  );
}
