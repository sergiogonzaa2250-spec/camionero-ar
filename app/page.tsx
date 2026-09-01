"use client";

import { useState } from "react";

type ResultadoRuta = {
  origen: string;
  destino: string;
  distanciaKm: number;
  duracionMinutos: number;
};

type Lugar = {
  lat: string;
  lon: string;
  display_name: string;
};

export default function Hogar() {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [vehiculo, setVehiculo] = useState("Camión");

  const [resultado, setResultado] = useState<ResultadoRuta | null>(null);
  const [error, establecerError] = useState("");
  const [cargando, conjuntoCargando] = useState(false);

  async function buscarLugar(texto: string): Promise<Lugar | null> {
    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=ar&q=${encodeURIComponent(
        texto
      )}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!respuesta.ok) {
      throw new Error("No se pudo consultar el servicio de mapas.");
    }

    const datos: Lugar[] = await respuesta.json();

    if (!datos || datos.length === 0) {
      return null;
    }

    return datos[0];
  }

  async function planificarRuta() {
    if (!origen.trim() || !destino.trim()) {
      establecerError("Completá el origen y el destino.");
      setResultado(null);
      return;
    }

    conjuntoCargando(true);
    establecerError("");
    setResultado(null);

    try {
      const origenLugar = await buscarLugar(origen);
      const destinoLugar = await buscarLugar(destino);

      if (!origenLugar || !destinoLugar) {
        throw new Error(
          "No se pudo localizar uno de los lugares. Probá agregando ciudad y provincia."
        );
      }

      const origenLon = Number(origenLugar.lon);
      const origenLat = Number(origenLugar.lat);

      const destinoLon = Number(destinoLugar.lon);
      const destinoLat = Number(destinoLugar.lat);

      if (
        !Number.isFinite(origenLon) ||
        !Number.isFinite(origenLat) ||
        !Number.isFinite(destinoLon) ||
        !Number.isFinite(destinoLat)
      ) {
        throw new Error("Las coordenadas obtenidas no son válidas.");
      }

      const rutaRespuesta = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origenLon},${origenLat};${destinoLon},${destinoLat}?overview=false`
      );

      if (!rutaRespuesta.ok) {
        throw new Error("El servicio de rutas no respondió.");
      }

      const datosDeRuta = await rutaRespuesta.json();

      const ruta = datosDeRuta?.routes?.[0];

      if (!ruta) {
        throw new Error("No se encontró una ruta entre los lugares.");
      }

      setResultado({
        origen: origenLugar.display_name,
        destino: destinoLugar.display_name,
        distanciaKm: Math.round((ruta.distance / 1000) * 10) / 10,
        duracionMinutos: Math.round(ruta.duration / 60),
      });
    } catch (err) {
      if (err instanceof Error) {
        establecerError(err.message);
      } else {
        establecerError("Ocurrió un error al calcular la ruta.");
      }

      setResultado(null);
    } finally {
      conjuntoCargando(false);
    }
  }

  function formatearDuracion(minutos: number) {
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

  return (
    <main className="recipiente">
      <div className="tarjeta">
        <h1>🚚 Camionero AR</h1>

        <p>
          Planificador de rutas para transporte pesado en Argentina.
        </p>

        <hr />

        <h2>Planificar viaje</h2>

        <label htmlFor="origen">Origen</label>

        <input
          id="origen"
          type="text"
          placeholder="Ej.: Campana, Buenos Aires"
          value={origen}
          onChange={(e) => setOrigen(e.target.value)}
        />

        <label htmlFor="destino">Destino</label>

        <input
          id="destino"
          type="text"
          placeholder="Ej.: Rosario, Santa Fe"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        />

        <label htmlFor="vehiculo">Tipo de vehículo</label>

        <select
          id="vehiculo"
          value={vehiculo}
          onChange={(e) => setVehiculo(e.target.value)}
        >
          <option>Camión</option>
          <option>Camión con acoplado</option>
          <option>Camión con semirremolque</option>
          <option>Bitren</option>
        </select>

        <button
          type="button"
          onClick={planificarRuta}
          disabled={cargando}
        >
          {cargando ? "⏳ Calculando..." : "🗺️ Planificar ruta"}
        </button>

        {error && (
          <div className="tarjeta" style={{ marginTop: "20px" }}>
            <h3>⚠️ Atención</h3>
            <p>{error}</p>
          </div>
        )}

        {resultado && (
          <div className="tarjeta" style={{ marginTop: "20px" }}>
            <h3>📍 Resultado de la ruta</h3>

            <p>
              <strong>Origen:</strong> {resultado.origen}
            </p>

            <p>
              <strong>Destino:</strong> {resultado.destino}
            </p>

            <p>
              <strong>Vehículo:</strong> {vehiculo}
            </p>

            <p>
              <strong>Distancia:</strong> {resultado.distanciaKm} kilómetros
            </p>

            <p>
              <strong>Duración estimada:</strong>{" "}
              {formatearDuracion(resultado.duracionMinutos)}
            </p>

            <p style={{ fontSize: "13px", opacity: 0.7 }}>
              La distancia y duración son estimaciones basadas en la ruta
              disponible.
            </p>
          </div>
        )}
      </div>
    </main>
  );
          }
