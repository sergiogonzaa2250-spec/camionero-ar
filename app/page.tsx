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

    try {
      // Buscar las coordenadas del origen
      const origenGeo = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          origen
        )}&limit=1&lang=es`
      );

      // Buscar las coordenadas del destino
      const destinoGeo = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          destino
        )}&limit=1&lang=es`
      );

      if (!origenGeo.ok || !destinoGeo.ok) {
        throw new Error("No se pudo localizar el lugar.");
      }

      const origenData = await origenGeo.json();
      const destinoData = await destinoGeo.json();

      // Obtener el primer resultado encontrado
      const origenFeature = origenData.features?.[0];
      const destinoFeature = destinoData.features?.[0];

      if (!origenFeature || !destinoFeature) {
        throw new Error(
          "No se pudo encontrar uno de los lugares. Probá agregando ciudad y provincia."
        );
      }

      // Coordenadas de Photon: [longitud, latitud]
      const [origenLon, origenLat] =
        origenFeature.geometry.coordinates;

      const [destinoLon, destinoLat] =
        destinoFeature.geometry.coordinates;

      // Solicitar la ruta a OSRM
      const rutaRespuesta = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origenLon},${origenLat};${destinoLon},${destinoLat}?overview=false`
      );

      if (!rutaRespuesta.ok) {
        throw new Error("El servicio de rutas no respondió.");
      }

      const datosDeRuta = await rutaRespuesta.json();

      const ruta = datosDeRuta.routes?.[0];

      if (!ruta) {
        throw new Error("No se encontró una ruta entre los lugares.");
      }

      setResultado({
        origen,
        destino,
        distanciaKm: Math.round((ruta.distance / 1000) * 10) / 10,
        duracionMinutos: Math.round(ruta.duration / 60),
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error al calcular la ruta.");
      }

      setResultado(null);
    } finally {
      setCargando(false);
    }
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

          <button
            onClick={planificarRuta}
            disabled={cargando}
          >
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
                <strong>Distancia:</strong>{" "}
                {resultado.distanciaKm} km
              </p>

              <p>
                <strong>Duración estimada:</strong>{" "}
                {Math.floor(resultado.duracionMinutos / 60)} h{" "}
                {resultado.duracionMinutos % 60} min
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
