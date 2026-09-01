"use client";

import { useState } from "react";

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
};

type ResultadoRuta = {
  origen: string;
  destino: string;
  vehiculo: string;
  distanciaKm: number;
  duracionMinutos: number;
};

const perfiles: Record<string, PerfilVehiculo> = {
  Camión: {
    largo: "12 m",
    ancho: "2.6 m",
    altura: "4.1 m",
    peso: "30 t",
    ejes: "3",
  },

  "Camión con acoplado": {
    largo: "20.5 m",
    ancho: "2.6 m",
    altura: "4.1 m",
    peso: "45 t",
    ejes: "6",
  },

  "Camión con semirremolque": {
    largo: "18.5 m",
    ancho: "2.6 m",
    altura: "4.1 m",
    peso: "45 t",
    ejes: "5",
  },

  Bitren: {
    largo: "25.5 m",
    ancho: "2.6 m",
    altura: "4.3 m",
    peso: "75 t",
    ejes: "9",
  },
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

  async function buscarLugar(lugar: string): Promise<Coordenadas> {
    const texto = lugar.trim();

    if (!texto) {
      throw new Error("Ingresá una ubicación.");
    }

    /*
     * Primero intentamos Photon.
     */
    try {
      const photonUrl =
        "https://photon.komoot.io/api/?" +
        new URLSearchParams({
          q: texto,
          limit: "1",
          lang: "es",
        }).toString();

      const respuesta = await fetch(photonUrl);

      if (respuesta.ok) {
        const datos = await respuesta.json();

        const feature = datos?.features?.[0];

        const coordenadas =
          feature?.geometry?.coordinates;

        if (
          Array.isArray(coordenadas) &&
          coordenadas.length >= 2 &&
          Number.isFinite(Number(coordenadas[0])) &&
          Number.isFinite(Number(coordenadas[1]))
        ) {
          return {
            lon: Number(coordenadas[0]),
            lat: Number(coordenadas[1]),
          };
        }
      }
    } catch {
      /*
       * Si Photon falla, seguimos con Nominatim.
       */
    }

    /*
     * Segundo intento: Nominatim / OpenStreetMap.
     */
    try {
      const nominatimUrl =
        "https://nominatim.openstreetmap.org/search?" +
        new URLSearchParams({
          q: texto,
          format: "jsonv2",
          limit: "1",
          countrycodes: "ar",
          "accept-language": "es",
        }).toString();

      const respuesta = await fetch(nominatimUrl);

      if (respuesta.ok) {
        const datos = await respuesta.json();

        const lugarEncontrado = datos?.[0];

        if (
          lugarEncontrado &&
          Number.isFinite(Number(lugarEncontrado.lon)) &&
          Number.isFinite(Number(lugarEncontrado.lat))
        ) {
          return {
            lon: Number(lugarEncontrado.lon),
            lat: Number(lugarEncontrado.lat),
          };
        }
      }
    } catch {
      /*
       * Se maneja abajo con un mensaje claro.
       */
    }

    throw new Error(
      `No se encontró "${texto}". Probá escribiendo ciudad y provincia.`
    );
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

    const coordenadas =
      `${origenCoords.lon},${origenCoords.lat};` +
      `${destinoCoords.lon},${destinoCoords.lat}`;

    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordenadas}` +
      "?overview=false&steps=false";

    const respuesta = await fetch(url);

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
        "La ruta recibida no contiene datos válidos."
      );
    }

    return {
      distanciaKm:
        Math.round((Number(ruta.distance) / 1000) * 10) / 10,

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

  const perfil = perfiles[vehiculo];

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
          <option>Camión</option>
          <option>
            Camión con acoplado
          </option>
          <option>
            Camión con semirremolque
          </option>
          <option>Bitren</option>
        </select>

        {perfil && (
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
                marginBottom: "18px",
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
                gap: "15px",
              }}
            >
              <div>
                <strong>Largo</strong>
                <br />
                {perfil.largo}
              </div>

              <div>
                <strong>Ancho</strong>
                <br />
                {perfil.ancho}
              </div>

              <div>
                <strong>Altura</strong>
                <br />
                {perfil.altura}
              </div>

              <div>
                <strong>Peso</strong>
                <br />
                {perfil.peso}
              </div>

              <div>
                <strong>Ejes</strong>
                <br />
                {perfil.ejes}
              </div>
            </div>
          </div>
        )}

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
              ⚠️ La ruta calculada es una
              estimación vial. El perfil del
              vehículo se muestra como
              referencia, pero todavía no
              modifica automáticamente el
              trazado.

              <br />
              <br />

              Esta versión todavía no verifica
              restricciones específicas para
              transporte pesado, peso por eje,
              altura máxima, puentes, peajes,
              tránsito, permisos ni
              restricciones legales.
            </div>
          </div>
        )}

        <p
          style={{
            textAlign: "center",
            marginTop: "30px",
            marginBottom: 0,
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
