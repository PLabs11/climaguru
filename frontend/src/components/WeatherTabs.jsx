/**
 * WeatherTabs — Tabbed display for weather details
 * Includes: Resumen, Fuentes, Pronóstico, Calidad del Aire
 */
import { useState } from 'react';

const FUENTE_COLORS = {
    open_meteo: '#10b981',
    openweathermap: '#f59e0b',
    meteosource: '#3b82f6',
    meteoblue: '#8b5cf6',
};

const FUENTE_NAMES = {
    open_meteo: 'Open-Meteo',
    openweathermap: 'OpenWeatherMap',
    meteosource: 'Meteosource',
    meteoblue: 'Meteoblue',
};

function MetricCard({ label, value, icon }) {
    return (
        <div className="metric-card">
            <div className="icon">{icon}</div>
            <div className="value">{value}</div>
            <div className="label">{label}</div>
        </div>
    );
}

function ResumenTab({ resumen }) {
    return (
        <div className="metrics-grid">
            <MetricCard label="Temperatura" value={`${resumen?.temperatura ?? '--'}°C`} icon="🌡️" />
            <MetricCard label="Humedad" value={`${resumen?.humedad ?? '--'}%`} icon="💧" />
            <MetricCard label="Viento" value={`${resumen?.viento ?? '--'} km/h`} icon="💨" />
            <MetricCard label="Presión" value={`${resumen?.presion ?? '--'} hPa`} icon="📊" />
        </div>
    );
}

function FuentesTab({ fuentes, errores }) {
    return (
        <div className="sources-list">
            {Object.entries(fuentes || {}).map(([key, data]) => (
                <div key={key} className="source-card" style={{ borderLeft: `4px solid ${FUENTE_COLORS[key] || '#666'}` }}>
                    <div className="source-header">
                        <span className="source-name">{data.fuente || FUENTE_NAMES[key] || key}</span>
                        <span className="source-badge" style={{ background: FUENTE_COLORS[key] || '#666' }}>✓</span>
                    </div>
                    <div className="source-data">
                        {data.temperatura != null && <span>🌡️ {Math.round(data.temperatura * 10) / 10}°C</span>}
                        {data.humedad != null && <span>💧 {data.humedad}%</span>}
                        {data.viento_velocidad != null && <span>💨 {Math.round(data.viento_velocidad * 10) / 10} km/h</span>}
                        {data.presion != null && <span>📊 {data.presion} hPa</span>}
                        {data.descripcion && <span>📝 {data.descripcion}</span>}
                    </div>
                    {data.amanecer && (
                        <div className="source-extra">🌅 {data.amanecer} / 🌇 {data.atardecer}</div>
                    )}
                </div>
            ))}
            {errores?.length > 0 && (
                <div className="errors-section">
                    <h4>APIs no disponibles:</h4>
                    {errores.map((err, i) => (
                        <div key={i} className="error-item">
                            ❌ {FUENTE_NAMES[err.fuente] || err.fuente}: {err.error?.substring(0, 60)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PronosticoTab({ pronostico }) {
    if (!pronostico?.diario) return <p style={{ color: 'var(--text-dim)' }}>Sin pronóstico disponible</p>;
    return (
        <div className="forecast-section">
            <h4>Pronóstico 7 días</h4>
            <div className="forecast-grid">
                {pronostico.diario.map((d, i) => (
                    <div key={i} className="forecast-day">
                        <div className="forecast-date">
                            {new Date(d.fecha).toLocaleDateString('es', { weekday: 'short', day: 'numeric' })}
                        </div>
                        <div className="forecast-temps">
                            <span className="temp-max">▲ {Math.round(d.temp_max)}°</span>
                            <span className="temp-min">▼ {Math.round(d.temp_min)}°</span>
                        </div>
                        <div className="forecast-rain">🌧️ {d.precipitacion?.toFixed(1)} mm</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AirQualityTab({ calidad_aire }) {
    if (!calidad_aire) return null;
    return (
        <div className="air-quality">
            <div className={`aqi-badge aqi-${calidad_aire.aqi}`}>{calidad_aire.aqi_label}</div>
            <p>Índice AQI: {calidad_aire.aqi}/5</p>
            {calidad_aire.componentes && (
                <div className="aqi-components">
                    {Object.entries(calidad_aire.componentes).slice(0, 6).map(([k, v]) => (
                        <div key={k} className="aqi-item">
                            <span>{k.toUpperCase()}</span>
                            <span>{v?.toFixed(1)} µg/m³</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function WeatherTabs({ weather }) {
    const [activeTab, setActiveTab] = useState('resumen');

    return (
        <>
            <div className="tabs">
                <button className={activeTab === 'resumen' ? 'active' : ''} onClick={() => setActiveTab('resumen')}>
                    📊 Resumen
                </button>
                <button className={activeTab === 'fuentes' ? 'active' : ''} onClick={() => setActiveTab('fuentes')}>
                    🔗 Fuentes ({weather.total_fuentes})
                </button>
                <button className={activeTab === 'pronostico' ? 'active' : ''} onClick={() => setActiveTab('pronostico')}>
                    📅 Pronóstico
                </button>
                {weather.calidad_aire && (
                    <button className={activeTab === 'aire' ? 'active' : ''} onClick={() => setActiveTab('aire')}>
                        🌿 Aire
                    </button>
                )}
            </div>

            <div className="tab-content">
                {activeTab === 'resumen' && <ResumenTab resumen={weather.resumen} />}
                {activeTab === 'fuentes' && <FuentesTab fuentes={weather.fuentes} errores={weather.errores} />}
                {activeTab === 'pronostico' && <PronosticoTab pronostico={weather.pronostico} />}
                {activeTab === 'aire' && <AirQualityTab calidad_aire={weather.calidad_aire} />}
            </div>
        </>
    );
}
