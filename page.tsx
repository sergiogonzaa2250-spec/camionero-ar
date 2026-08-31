 "use client";

import { useMemo, useState } from "react";

type Vehicle = {
  type: string;
  weight: number;
  height: number;
  width: number;
  length: number;
};

const defaults: Vehicle = {
  type: "Tractor + semi",
  weight: 45,
  height: 4.1,
  width: 2.6,
  length: 18.6,
};

export default function Home() {
  const [vehicle, setVehicle] = useState(defaults);
  const [origin, setOrigin] = useState("Campana, Buenos Aires");
  const [destination, setDestination] = useState("Puerto de Buenos Aires, CABA");
  const [searched, setSearched] = useState(false);

  const status = useMemo(() => {
    if (!searched) return null;
    return {
      green: 0,
      orange: 1,
      red: 0,
      unknown: 1,
    };
  }, [searched]);

  function searchRoute() {
    setSearched(true);
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="truck">🚛</span>
          <div>
            <strong>CAMIONERO AR</strong>
            <small>Rutas pensadas para transporte pesado</small>
          </div>
        </div>
        <span className="badge">MVP</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">TRANSPORTE PESADO · ARGENTINA</span>
          <h1>Encontrá una ruta pensada para tu camión.</h1>
          <p>
            Seleccioná tu configuración, indicá origen y destino y evaluaremos
            las rutas según las restricciones disponibles.
          </p>
        </div>

        <div className="panel">
          <label>📍 Origen</label>
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} />

          <label>🎯 Destino</label>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} />

          <div className="divider" />

          <div className="section-title">🚛 Mi vehículo</div>

          <select
            value={vehicle.type}
            onChange={(e) => setVehicle({ ...vehicle, type: e.target.value })}
          >
            <option>Tractor + semi</option>
            <option>Camión rígido</option>
            <option>Camión + acoplado</option>
            <option>Bitren</option>
          </select>

          <div className="grid">
            <NumberField label="Peso máx. (t)" value={vehicle.weight}
              onChange={(v) => setVehicle({ ...vehicle, weight: v })} />
            <NumberField label="Altura (m)" value={vehicle.height}
              onChange={(v) => setVehicle({ ...vehicle, height: v })} />
            <NumberField label="Ancho (m)" value={vehicle.width}
              onChange={(v) => setVehicle({ ...vehicle, width: v })} />
            <NumberField label="Largo (m)" value={vehicle.length}
              onChange={(v) => setVehicle({ ...vehicle, length: v })} />
          </div>

          <button className="primary" onClick={searchRoute}>
            BUSCAR RUTA
          </button>
        </div>
      </section>

      <section className="map-card">
        <div className="map-placeholder">
          <div className="map-grid" />
          <div className="route route-main" />
          <div className="route route-alt" />
          <div className="pin pin-a">A</div>
          <div className="pin pin-b">B</div>
          <div className="map-label">Mapa de rutas · vista previa</div>
        </div>

        <div className="result-panel">
          <div className="result-head">
            <div>
              <span className="eyebrow">RESULTADO</span>
              <h2>{searched ? "Ruta evaluada" : "Esperando una consulta"}</h2>
            </div>
            {searched && <span className="confidence">PRELIMINAR</span>}
          </div>

          {!searched ? (
            <p className="muted">
              Completá los datos y presioná <b>Buscar ruta</b>. Esta versión
              todavía usa datos de demostración: no presenta restricciones
              reales como si estuvieran verificadas.
            </p>
          ) : (
            <>
              <div className="route-summary">
                <div><b>{origin}</b><span>Origen</span></div>
                <div className="arrow">→</div>
                <div><b>{destination}</b><span>Destino</span></div>
              </div>

              <div className="stats">
                <Status label="Compatible" value={status!.green} tone="green" />
                <Status label="Condicional" value={status!.orange} tone="orange" />
                <Status label="Incompatible" value={status!.red} tone="red" />
                <Status label="Sin datos" value={status!.unknown} tone="gray" />
              </div>

              <div className="notice orange">
                <b>🟠 Evaluación preliminar</b>
                <span>
                  La ruta todavía no está conectada al motor normativo ni a
                  datos viales en tiempo real.
                </span>
              </div>

              <button className="secondary" onClick={() => alert("Función preparada para la próxima versión.")}>
                ¿POR QUÉ ESTA RUTA?
              </button>
            </>
          )}
        </div>
      </section>

      <section className="features">
        <Feature icon="⚖️" title="Perfil del camión" text="Las rutas dependerán de peso y dimensiones." />
        <Feature icon="🗺️" title="Restricciones" text="Cruce futuro con datos viales y normativa." />
        <Feature icon="⚠️" title="Reportar" text="Los camioneros podrán avisar cambios o errores." />
      </section>

      <footer>
        Camionero AR · Prototipo inicial · La información debe verificarse con la señalización y autoridad competente.
      </footer>
    </main>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="number-field">
      {label}
      <input type="number" step="0.1" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Status({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`status ${tone}`}><strong>{value}</strong><span>{label}</span></div>;
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <article className="feature"><span>{icon}</span><div><b>{title}</b><p>{text}</p></div></article>;
}