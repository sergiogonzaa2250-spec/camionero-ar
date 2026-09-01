"use client";

import { useState } from "react";

type Coordenadas = [number, number];

type CaracteristicaPhoton = {
  geometry?: {
    coordinates?: Coordenadas;
  };
  properties?: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

type ResultadoRuta = {
  origen: string;
  destino: string;
  vehiculo: string;
  distanciaKm: number;
  duracionMinutos: number;
};

export default function Hogar() {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [vehiculo, setVehiculo] = useState("Camión");

  const [resultado, setResultado] =
    useState<ResultadoRuta | null>(null);

  const [error, establecerError] = useState("");
  const [cargando, conjuntoCargando] = useState(false);

  async function buscarLugar(
    lugar: string
  ): Promise<CaracteristicaPhoton> {
    const consulta = encodeURIComponent(
      `${lugar.trim()}, Argentina`
    );

    const url =
      `https://photon.komoot.io/api/?q=${consulta}` +
      `&limit=1&lang=es`;

    let respuesta: Response;

    try {
      respuesta = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch {
      throw new Error(
        "No se pudo conectar con el servicio de mapas. Revisá tu conexión a Internet e intentá nuevamente."
      );
    }

    if (!respuesta.ok) {
      throw new Error(
        `El servicio de mapas respondió con error (${respuesta.status}). Intentá nuevamente.`
      );
    }

    let datos: {
      features?: CaracteristicaPhoton[];
    };

    try {
      datos = await respuesta.json();
    } catch {
      throw new Error(
        "El servicio de mapas devolvió una respuesta inválida."
      );
    }

    const lugarEncontrado = datos.features?.[0];

    if (!lugarEncontrado) {
      throw new Error(
        `No se encontró "${lugar}". Probá escribiendo ciudad y provincia.`
      );
    }

    const coordenadas =
      lugarEncontrado.geometry?.coordinates;

    if (
      !coordenadas ||
      coordenadas.length < 2 ||
      !Number.isFinite(coordenadas[0]) ||
      !Number.isFinite(coordenadas[1])
    ) {
      throw new Error(
        `No se pudieron obtener las coordenadas de "${lugar}".`
      );
    }

    return lugarEncontrado;
  }

  async function planificarRuta() {
    if (!origen.trim() || !destino.trim()) {
      establecerError(
        "Completá el origen y el destino."
      );
      setResultado(null);
      return;
    }

    conjuntoCargando(true);
    establecerError("");
    setResultado(null);

    try {
      // ==============================
      // BUSCAR ORIGEN
      // ==============================

      const origenCaracteristica =
        await buscarLugar(origen);

      // ==============================
      // BUSCAR DESTINO
      // ==============================

      const destinoCaracteristica =
        await buscarLugar(destino);

      // ==============================
      // OBTENER COORDENADAS
      // Photon devuelve:
      // [longitud, latitud]
      // ==============================

      const origenCoordenadas =
        origenCaracteristica.geometry?.coordinates;

      const destinoCoordenadas =
        destinoCaracteristica.geometry?.coordinates;

      if (
        !origenCoordenadas ||
        !destinoCoordenadas ||
        origenCoordenadas.length < 2 ||
        destinoCoordenadas.length < 2
      ) {
        throw new Error(
          "No se pudieron obtener las coordenadas de los lugares."
        );
      }

      const [origenLon, origenLat] =
        origenCoordenadas;

      const [destinoLon, destinoLat] =
        destinoCoordenadas;

      // ==============================
      // CALCULAR RUTA CON OSRM
      // ==============================

      const rutaUrl =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origenLon},${origenLat};` +
        `${destinoLon},${destinoLat}` +
        `?overview=false&steps=false`;

      let rutaRespuesta: Response;

      try {
        rutaRespuesta = await fetch(rutaUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });
      } catch {
        throw new Error(
          "No se pudo conectar con el servicio de rutas."
        );
      }

      if (!rutaRespuesta.ok) {
        throw new Error(
          `El servicio de rutas respondió con error (${rutaRespuesta.status}).`
        );
      }

      let datosDeRuta: {
        code?: string;
        message?: string;
        routes?: Array<{
          distance: number;
          duration: number;
        }>;
      };

      try {
        datosDeRuta = await rutaRespuesta.json();
      } catch {
        throw new Error(
          "El servicio de rutas devolvió una respuesta inválida."
        );
      }

      // ==============================
      // VALIDAR RESPUESTA DE OSRM
      // ==============================

      if (datosDeRuta.code !== "Ok") {
        throw new Error(
          datosDeRuta.message ||
            `OSRM no pudo calcular la ruta (${datosDeRuta.code || "error"}).`
        );
      }

      const ruta = datosDeRuta.routes?.[0];

      if (!ruta) {
        throw new Error(
          "No se encontró una ruta entre los lugares indicados."
        );
      }

      // ==============================
      // DISTANCIA
      // OSRM devuelve metros
      // ==============================

      const distanciaKm =
        Math.round(
          (ruta.distance / 1000) * 10
        ) / 10;

      // ==============================
      // DURACIÓN
      // OSRM devuelve segundos
      // ==============================

      const duracionMinutos =
        Math.round(ruta.duration / 60);

      // ==============================
      // GUARDAR RESULTADO
      // ==============================

      setResultado({
        origen,
        destino,
        vehiculo,
        distanciaKm,
        duracionMinutos,
      });
    } catch (error) {
      if (error instanceof Error) {
        establecerError(error.message);
      } else {
        establecerError(
          "Ocurrió un error al calcular la ruta."
        );
      }

      setResultado(null);
    } finally {
      conjuntoCargando(false);
    }
  }

  function formatearDuracion(
    minutos: number
  ) {
    const horas = Math.floor(
      minutos / 60
    );

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
        }}
      >
        <div
          style={{
            background: "white",
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
            🚛 Camionero AR
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.6,
              color: "#374151",
              marginBottom: "25px",
            }}
          >
            Planificador de rutas para
            transporte pesado en Argentina.
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

          {/* ORIGEN */}

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

          {/* DESTINO */}

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

          {/* VEHÍCULO */}

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
              background: "white",
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

          {/* BOTÓN */}

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
              color: "white",
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

          {/* ERROR */}

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

          {/* RESULTADO */}

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
                <strong>Distancia:</strong>{" "}
                {resultado.distanciaKm} kilómetros
              </p>

              <p>
                <strong>
                  Duración estimada:
                </strong>{" "}
                {formatearDuracion(
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
                ⚠️ La distancia y duración
                son estimaciones de la ruta
                vial disponible.

                <br />
                <br />

                Esta versión todavía no
                verifica restricciones legales
                específicas para camiones,
                pesos, alturas, puentes o
                circulación de transporte pesado.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
  }
