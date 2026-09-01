"use client";

import { useState } from "react";

type Coordenadas = {
  lon: number;
  lat: number;
};

type ResultadoRuta = {
  origen: string;
  destino: string;
  vehiculo: string;
  distanciaKm: number;
  duracionMinutos: number;
};

export default function CamioneroAR() {
  const [origen, setOrigen] = useState(
    "Campana, Buenos Aires, Argentina"
  );

  const [destino, setDestino] = useState(
    "Rosario, Santa Fe, Argentina"
  );

  const [vehiculo, setVehiculo] = useState("Camión");

  const [resultado, setResultado] =
    useState<ResultadoRuta | null>(null);

  const [error, setError] = useState("");

  const [cargando, setCargando] = useState(false);

  // --------------------------------------------------
  // BUSCAR COORDENADAS
  // --------------------------------------------------

  async function buscarLugar(
    lugar: string
  ): Promise<Coordenadas> {
    const texto = lugar.trim();

    if (!texto) {
      throw new Error("Ingresá una ubicación.");
    }

    const parametros = new URLSearchParams();

    parametros.set("q", texto);
    parametros.set("limit", "1");

    const url =
      `https://photon.komoot.io/api/?${parametros.toString()}`;

    const respuesta = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!respuesta.ok) {
      throw new Error(
        `No se pudo localizar "${texto}". El servicio de mapas respondió con error ${respuesta.status}.`
      );
    }

    const datos = await respuesta.json();

    const caracteristica = datos?.features?.[0];

    if (!caracteristica) {
      throw new Error(
        `No se encontró "${texto}". Probá escribir ciudad y provincia.`
      );
    }

    const coordenadas =
      caracteristica?.geometry?.coordinates;

    if (
      !Array.isArray(coordenadas) ||
      coordenadas.length < 2
    ) {
      throw new Error(
        `No se pudieron obtener las coordenadas de "${texto}".`
      );
    }

    const lon = Number(coordenadas[0]);
    const lat = Number(coordenadas[1]);

    if (
      !Number.isFinite(lon) ||
      !Number.isFinite(lat)
    ) {
      throw new Error(
        `Las coordenadas de "${texto}" no son válidas.`
      );
    }

    return {
      lon,
      lat,
    };
  }

  // --------------------------------------------------
  // CALCULAR RUTA
  // --------------------------------------------------

  async function calcularRuta(
    origenCoords: Coordenadas,
    destinoCoords: Coordenadas
  ) {
    const coordenadas =
      `${origenCoords.lon},${origenCoords.lat};` +
      `${destinoCoords.lon},${destinoCoords.lat}`;

    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordenadas}` +
      `?overview=false&steps=false`;

    const respuesta = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!respuesta.ok) {
      throw new Error(
        `El servicio de rutas respondió con error ${respuesta.status}.`
      );
    }

    const datos = await respuesta.json();

    if (datos?.code !== "Ok") {
      throw new Error(
        datos?.message ||
          "El servicio de rutas no pudo calcular el recorrido."
      );
    }

    const ruta = datos?.routes?.[0];

    if (!ruta) {
      throw new Error(
        "No se encontró una ruta entre el origen y el destino."
      );
    }

    const distancia =
      Number(ruta.distance);

    const duracion =
      Number(ruta.duration);

    if (
      !Number.isFinite(distancia) ||
      !Number.isFinite(duracion)
    ) {
      throw new Error(
        "La respuesta de rutas no contiene datos válidos."
      );
    }

    return {
      distanciaKm:
        Math.round((distancia / 1000) * 10) / 10,

      duracionMinutos:
        Math.round(duracion / 60),
    };
  }

  // --------------------------------------------------
  // PLANIFICAR
  // --------------------------------------------------

  async function planificarRuta() {
    if (
      !origen.trim() ||
      !destino.trim()
    ) {
      setError(
        "Completá el origen y el destino."
      );

      setResultado(null);

      return;
    }

    setCargando(true);

    setError("");

    setResultado(null);

    try {
      const origenCoords =
        await buscarLugar(origen);

      const destinoCoords =
        await buscarLugar(destino);

      const ruta =
        await calcularRuta(
          origenCoords,
          destinoCoords
        );

      setResultado({
        origen: origen.trim(),
        destino: destino.trim(),
        vehiculo,
        distanciaKm:
          ruta.distanciaKm,
        duracionMinutos:
          ruta.duracionMinutos,
      });
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(
          "Ocurrió un error inesperado al calcular la ruta."
        );
      }
    } finally {
      setCargando(false);
    }
  }

  // --------------------------------------------------
  // FORMATO DE DURACIÓN
  // --------------------------------------------------

  function formatoDuracion(
    minutos: number
  ) {
    const horas =
      Math.floor(minutos / 60);

    const minutosRestantes =
      minutos % 60;

    if (horas === 0) {
      return `${minutosRestantes} min`;
    }

    if (minutosRestantes === 0) {
      return `${horas} h`;
    }

    return `${horas} h ${minutosRestantes} min`;
  }

  // --------------------------------------------------
  // INTERFAZ
  // --------------------------------------------------

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
            setVehiculo(e.target.value)
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "16px",
            borderRadius: "12px",
            border:
              "1px solid #cbd5e1",
            fontSize: "17px",
            marginBottom: "25px",
            background: "#ffffff",
          }}
        >
          <option>
            Camión
          </option>

          <option>
            Camión con acoplado
          </option>

          <option>
            Camión con semirremolque
          </option>

          <option>
            Bitren
          </option>
        </select>

        <button
          onClick={planificarRuta}
          disabled={cargando}
          style={{
            width: "100%",
            padding: "18px",
            border: "none",
            borderRadius: "12px",
            background:
              cargando
                ? "#64748b"
                : "#30384d",
            color: "#ffffff",
            fontSize: "18px",
            fontWeight: "bold",
            cursor:
              cargando
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
              <strong>
                Origen:
              </strong>{" "}
              {resultado.origen}
            </p>

            <p>
              <strong>
                Destino:
              </strong>{" "}
              {resultado.destino}
            </p>

            <p>
              <strong>
                Vehículo:
              </strong>{" "}
              {resultado.vehiculo}
            </p>

            <p>
              <strong>
                Distancia:
              </strong>{" "}
              {resultado.distanciaKm} km
            </p>

            <p>
              <strong>
                Duración estimada:
              </strong>{" "}
              {formatoDuracion(
                resultado.duracionMinutos
              )}
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                borderRadius: "12px",
                background: "#fff7ed",
                color: "#7c2d12",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              ⚠️ La distancia y duración son
              estimaciones de la ruta vial.
              Esta versión todavía no verifica
              restricciones específicas para
              vehículos pesados, pesos máximos,
              alturas de puentes, peajes,
              tránsito ni restricciones legales.
            </div>
          </div>
        )}
      </div>
    </main>
  );
      }
