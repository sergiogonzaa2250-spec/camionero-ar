"use client";

import { useState } from "react";

type ResultadoRuta = {
  origen: string;
  destino: string;
  distanciaKm: number;
  duracionMinutos: number;
};

export default function Home() {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [vehiculo, setVehiculo] = useState("Camión");
  const [resultado, setResultado] = useState<ResultadoRuta | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function planificarRuta() {
    if (!origen.trim() || !destino.trim()) {
      setError("Completá el origen y el destino.");
      setResultado(null);
      return;
    }

    setCargando(true);
    setError("");
    setResultado(null);

    const origenGeo = await fetch(
  `https://photon.komoot.io/api/?q=${encodeURIComponent(origen)}&limit=1&lang=es`
);

const destinoGeo = await fetch(
  `https://photon.komoot.io/api/?q=${encodeURIComponent(destino)}&limit=1&lang=es`

      );

      if (!origenGeo.ok || !destinoGeo.ok) {
        throw new Error("No se pudo localizar el lugar.");
      }

      const origenData = await origenGeo.json();
      const destinoData = await destinoGeo.json();

      const OrigenCaracteristica = origenData.features?.[0];
const DestinoCaracteristica = destinoData.features?.[0];

      if (!origenFeature || !destinoFeature) {
        throw new Error(
          "No pude encontrar uno de los lugares. Probá agregando ciudad y provincia."
        );
      }

      const [origenLon, origenLat] = origenFeature.geometry.coordinates;
      const [destinoLon, destinoLat] = destinoFeature.geometry.coordinates;

      const rutaResponse = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origenLon},${origenLat};${destinoLon},${destinoLat}?overview=false`
      );

      if (!rutaResponse.ok) {
        throw new Error("El servicio de rutas no respondió.");
      }

      const rutaData = await rutaResponse.json();
      const ruta = rutaData.routes?.[0];

      if (!ruta) {
        throw new Error("No se encontró una ruta.");
      }

      setResultado({
        origen,
        destino,
        distanciaKm: Math.round((ruta.distance / 1000) * 10) / 10,
        duracionMinutos: Math.round(ruta.duration / 60),
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Ocurrió un error al calcular la ruta."
      );
    } finally {
      setCargando(false);
    }
  }

  function abrirNavegacion() {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origen
    )}&destination=${encodeURIComponent(
      destino
    )}&travelmode=driving`;

    window.open(url, "_blank");
  }

  return (
    <main>
      <div className="container">
        <div className="card">
          <h1>🚛 Camionero AR</h1>

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

          <button onClick={planificarRuta} disabled={cargando}>
            {cargando ? "⏳ Calculando..." : "🗺️ Planificar ruta"}
          </button>

          {error && (
            <div className="card" style={{ marginTop: "20px" }}>
              <strong>⚠️ Atención</strong>
              <p>{error}</p>
            </div>
          )}

          {resultado && (
            <div className="card" style={{ marginTop: "20px" }}>
              <h2>📍 Ruta calculada</h2>

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
                <strong>Distancia:</strong> {resultado.distanciaKm} km
              </p>

              <p>
                <strong>Tiempo estimado:</strong>{" "}
                {Math.floor(resultado.duracionMinutos / 60)} h{" "}
                {resultado.duracionMinutos % 60} min
              </p>

              <button onClick={abrirNavegacion}>
                🧭 Abrir navegación
              </button>

              <p style={{ fontSize: "14px", marginTop: "15px" }}>
                ⚠️ Esta primera versión calcula una ruta vial general.
                Todavía no verifica restricciones específicas de camiones.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
                }
