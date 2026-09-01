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
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: texto,
        format: "jsonv2",
        limit: "1",
        countrycodes: "ar",
        "accept-language": "es",
      }).toString();

    let respuesta: Response;

    try {
      respuesta = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });
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

    const lugarEncontrado = datos?.[0];

    if (!lugarEncontrado) {
      throw new Error(
        `No se encontró "${texto}". Probá agregando ciudad y provincia.`
      );
    }

    const lat = Number(lugarEncontrado.lat);
    const lon = Number(lugarEncontrado.lon);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon)
    ) {
      throw new Error(
        `No se pudieron obtener las coordenadas de "${texto}".`
      );
    }

    return {
      lon,
      lat,
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

    if (
      !Number.isFinite(consumo) ||
      consumo <= 0
    ) {
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
                <strong>
                  Consumo sugerido
                </strong>
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
            min="0.1"
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
              fontSize: "16px",
              color: "#475569",
              whiteSpace: "nowrap",
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
              fontSize: "18px",
              color: "#475569",
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
              fontSize: "16px",
              color: "#475569",
              whiteSpace: "nowrap",
            }}
          >
            por litro
          </span>
        </div>

        <button
          type="button"
          onClick={planificarRuta}
          disabled={cargando}
          style={{
            width: "100%",
            padding: "18px",
            borderRadius: "14px",
            border: "none",
            background: cargando
              ? "#94a3b8"
              : "#172033",
            color: "#ffffff",
            fontSize: "19px",
            fontWeight: "bold",
            cursor: cargando
              ? "not-allowed"
              : "pointer",
            marginBottom: "20px",
          }}
        >
          {cargando
            ? "Calculando ruta..."
            : "Planificar ruta"}
        </button>

        {error && (
          <div
            style={{
              padding: "18px",
              borderRadius: "14px",
              background: "#fef2f2",
              border:
                "1px solid #fecaca",
              color: "#991b1b",
              marginBottom: "20px",
              lineHeight: 1.5,
            }}
          >
            <strong>
              ⚠️ No se pudo calcular
            </strong>

            <br />

            {error}
          </div>
        )}

        {resultado && (
          <div
            style={{
              marginTop: "10px",
              padding: "22px",
              borderRadius: "18px",
              background: "#eff6ff",
              border:
                "1px solid #bfdbfe",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                fontSize: "23px",
                color: "#172033",
              }}
            >
              📍 Resultado de la ruta
            </h3>

            <div
              style={{
                display: "grid",
                gap: "12px",
                color: "#1e293b",
              }}
            >
              <div>
                <strong>Origen:</strong>{" "}
                {resultado.origen}
              </div>

              <div>
                <strong>Destino:</strong>{" "}
                {resultado.destino}
              </div>

              <div>
                <strong>Vehículo:</strong>{" "}
                {resultado.vehiculo}
              </div>

              <div
                style={{
                  fontSize: "20px",
                }}
              >
                <strong>Distancia:</strong>{" "}
                {formatoNumero(
                  resultado.distanciaKm
                )}{" "}
                km
              </div>

              <div
                style={{
                  fontSize: "20px",
                }}
              >
                <strong>Duración:</strong>{" "}
                {formatoDuracion(
                  resultado.duracionMinutos
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: "22px",
                paddingTop: "20px",
                borderTop:
                  "1px solid #bfdbfe",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  fontSize: "23px",
                  color: "#172033",
                }}
              >
                ⛽ Estimación de combustible
              </h3>

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  color: "#1e293b",
                }}
              >
                <div>
                  <strong>
                    Distancia ida y vuelta:
                  </strong>{" "}
                  {formatoNumero(
                    distanciaIdaVuelta
                  )}{" "}
                  km
                </div>

                <div>
                  <strong>
                    Consumo:
                  </strong>{" "}
                  {formatoNumero(consumo)}{" "}
                  L/100 km
                </div>

                <div
                  style={{
                    fontSize: "20px",
                  }}
                >
                  <strong>
                    Litros estimados:
                  </strong>{" "}
                  {formatoNumero(
                    litrosEstimados
                  )}{" "}
                  L
                </div>

                <div>
                  <strong>
                    Precio gasoil:
                  </strong>{" "}
                  {formatoPesos(
                    precioGasoil
                  )}{" "}
                  / L
                </div>

                <div
                  style={{
                    marginTop: "8px",
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#ffffff",
                    fontSize: "23px",
                    fontWeight: "bold",
                    color: "#172033",
                  }}
                >
                  💰 Costo estimado:
                  <br />
                  {formatoPesos(
                    costoEstimado
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                borderRadius: "12px",
                background: "#fffbeb",
                border:
                  "1px solid #fde68a",
                color: "#92400e",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              ⚠️ <strong>Importante:</strong>{" "}
              esta versión calcula una ruta
              vial mediante servicios de
              mapas. Todavía no verifica
              restricciones legales específicas
              para transporte pesado, puentes,
              peso por eje, altura, permisos,
              horarios o corredores habilitados.
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: "30px",
            paddingTop: "20px",
            borderTop:
              "1px solid #e5e7eb",
            fontSize: "13px",
            color: "#64748b",
            lineHeight: 1.5,
            textAlign: "center",
          }}
        >
          Camionero AR · Planificación de
          transporte pesado en Argentina
        </div>
      </div>
    </main>
  );
}
