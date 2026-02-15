import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// Mapeo de códigos de clima Open-Meteo a descripciones
const weatherCodes = {
    0: "Despejado ☀️",
    1: "Mayormente despejado 🌤️",
    2: "Parcialmente nublado ⛅",
    3: "Nublado ☁️",
    45: "Niebla 🌫️",
    48: "Niebla con escarcha 🌫️",
    51: "Llovizna ligera 🌧️",
    53: "Llovizna moderada 🌧️",
    55: "Llovizna intensa 🌧️",
    61: "Lluvia ligera 🌧️",
    63: "Lluvia moderada 🌧️",
    65: "Lluvia intensa 🌧️",
    71: "Nieve ligera 🌨️",
    73: "Nieve moderada 🌨️",
    75: "Nieve intensa 🌨️",
    80: "Chubascos ligeros 🌦️",
    81: "Chubascos moderados 🌦️",
    82: "Chubascos intensos 🌦️",
    95: "Tormenta eléctrica ⛈️",
    96: "Tormenta con granizo ⛈️",
    99: "Tormenta severa ⛈️"
};

export default function ClimaDetalle() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    const URL_CLIMA = `http://127.0.0.1:8080/api/clima/${id}`;

    useEffect(() => {
        fetch(URL_CLIMA)
            .then((res) => {
                if (!res.ok) throw new Error("No se pudo obtener el clima");
                return res.json();
            })
            .then((responseData) => {
                setData(responseData);
                setCargando(false);
            })
            .catch((err) => {
                console.error("Error:", err);
                setError("Error al cargar datos del clima. Verifica que el backend esté corriendo.");
                setCargando(false);
            });
    }, [id]);

    if (cargando) {
        return (
            <div className="container text-center mt-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-2">Consultando APIs climáticas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">{error}</div>
                <Link to="/" className="btn btn-secondary">Volver</Link>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            {/* Header con info de la estación */}
            <div className="card shadow-lg mb-4">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <div>
                        <h2 className="mb-0">🌡️ Clima Actual</h2>
                        <small>{data.estacion?.nombre}</small>
                    </div>
                    <Link to="/" className="btn btn-outline-light btn-sm">← Volver</Link>
                </div>

                <div className="card-body">
                    <p className="text-muted mb-3">
                        📍 Coordenadas: {data.estacion?.latitud}, {data.estacion?.longitud}
                    </p>

                    {/* Grid de fuentes de datos */}
                    <div className="row">
                        {data.fuentes && data.fuentes.map((fuente, index) => (
                            <div key={index} className="col-md-4 mb-4">
                                <div className="card h-100 border-info">
                                    <div className="card-header bg-info text-white">
                                        <strong>{fuente.nombre}</strong>
                                    </div>
                                    <div className="card-body">
                                        {/* Temperatura */}
                                        {fuente.datos.temperatura !== undefined && (
                                            <div className="text-center mb-3">
                                                <span className="display-4 text-primary">
                                                    {Math.round(fuente.datos.temperatura)}°C
                                                </span>
                                                {fuente.datos.sensacion_termica !== undefined && (
                                                    <p className="text-muted mb-0">
                                                        Sensación: {Math.round(fuente.datos.sensacion_termica)}°C
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Descripción/Código */}
                                        {fuente.datos.descripcion && (
                                            <p className="text-center text-capitalize fw-bold">
                                                {fuente.datos.descripcion}
                                            </p>
                                        )}
                                        {fuente.datos.codigo_clima !== undefined && (
                                            <p className="text-center fw-bold">
                                                {weatherCodes[fuente.datos.codigo_clima] || `Código: ${fuente.datos.codigo_clima}`}
                                            </p>
                                        )}
                                        {fuente.datos.resumen && (
                                            <p className="text-center text-capitalize fw-bold">
                                                {fuente.datos.resumen}
                                            </p>
                                        )}

                                        {/* Otros datos */}
                                        <ul className="list-unstyled">
                                            {fuente.datos.humedad !== undefined && (
                                                <li>💧 Humedad: <strong>{fuente.datos.humedad}%</strong></li>
                                            )}
                                            {fuente.datos.viento_velocidad !== undefined && (
                                                <li>💨 Viento: <strong>{fuente.datos.viento_velocidad} {fuente.datos.unidades?.viento || 'km/h'}</strong></li>
                                            )}
                                            {fuente.datos.precipitacion !== undefined && (
                                                <li>🌧️ Precipitación: <strong>{fuente.datos.precipitacion} mm</strong></li>
                                            )}
                                            {fuente.datos.presion !== undefined && (
                                                <li>🌡️ Presión: <strong>{fuente.datos.presion} hPa</strong></li>
                                            )}
                                            {fuente.datos.nubosidad !== undefined && (
                                                <li>☁️ Nubosidad: <strong>{fuente.datos.nubosidad}%</strong></li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mensaje si no hay fuentes */}
                    {(!data.fuentes || data.fuentes.length === 0) && (
                        <div className="alert alert-warning">
                            No se encontraron datos climáticos disponibles para esta ubicación.
                        </div>
                    )}

                    {/* Debug: datos crudos */}
                    <details className="mt-4">
                        <summary className="text-muted">Ver datos crudos (JSON)</summary>
                        <pre className="bg-dark text-light p-3 rounded mt-2" style={{ maxHeight: '300px', overflow: 'auto' }}>
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
        </div>
    );
}
