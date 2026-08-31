"use client";

import { useState } from "react";

export default function Home() {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [vehiculo, setVehiculo] = useState("Camión");
  const [resultado, setResultado] = useState("");

  function planificarRuta() {
    if (!origen || !destino) {
      setResultado("Completá el origen y el destino.");
      return;
    }

    setResultado(
      `Ruta solicitada: ${origen} → ${destino}. Vehículo: ${vehiculo}.`
    );
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

          <button onClick={planificarRuta}>
            Planificar ruta
          </button>

          {resultado && (
            <div className="card" style={{ marginTop: "20px" }}>
              <strong>Resultado</strong>
              <p>{resultado}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
