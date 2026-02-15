/**
 * WeatherMap — Interactive Leaflet map with weather overlays and IDEAM radars
 */
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const radarIcon = new L.DivIcon({
    className: 'radar-marker',
    html: '<div class="radar-dot">📡</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

const weatherIcon = new L.DivIcon({
    className: 'weather-marker',
    html: '<div class="weather-dot">🌦️</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
});

function MapRecenter({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, zoom || 8, { duration: 1.5 });
    }, [center, zoom, map]);
    return null;
}

// Read OWM key from env, fallback to empty string (tile layer just won't show)
const OWM_KEY = import.meta.env.VITE_OWM_API_KEY || '';

export default function WeatherMap({ weather, radares, mapCenter, mapZoom, showRadarCoverage, onToggleCoverage }) {
    return (
        <div className="right-panel">
            <div className="map-header">
                <h3>🗺️ Mapa Meteorológico</h3>
                <label className="toggle">
                    <input type="checkbox" checked={showRadarCoverage} onChange={e => onToggleCoverage(e.target.checked)} />
                    <span>Cobertura radar</span>
                </label>
            </div>

            <div className="map-container">
                <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
                    <MapRecenter center={mapCenter} zoom={mapZoom} />

                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />

                    {OWM_KEY && (
                        <TileLayer
                            url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
                            opacity={0.5}
                        />
                    )}

                    {weather?.coordenadas && (
                        <Marker
                            position={[weather.coordenadas.latitude, weather.coordenadas.longitude]}
                            icon={weatherIcon}
                        >
                            <Popup>
                                <strong>🌦️ {weather.ciudad}</strong><br />
                                🌡️ {weather.resumen?.temperatura}°C<br />
                                💧 {weather.resumen?.humedad}%<br />
                                💨 {weather.resumen?.viento} km/h
                            </Popup>
                        </Marker>
                    )}

                    {radares.map(radar => (
                        <Marker key={radar.nombre} position={[radar.lat, radar.lon]} icon={radarIcon}>
                            <Popup>
                                <strong>📡 {radar.nombre}</strong><br />
                                {radar.ubicacion}<br />
                                Tipo: {radar.tipo}<br />
                                Cobertura: {radar.cobertura_km} km<br />
                                Estado: <span style={{ color: '#10b981' }}>{radar.estado}</span><br />
                                <small>Datos: {radar.delay} de retraso</small>
                            </Popup>
                        </Marker>
                    ))}

                    {showRadarCoverage && radares.map(radar => (
                        <Circle
                            key={`${radar.nombre}-circle`}
                            center={[radar.lat, radar.lon]}
                            radius={radar.cobertura_km * 1000}
                            pathOptions={{
                                color: '#10b981', fillColor: '#10b981',
                                fillOpacity: 0.06, weight: 1, dashArray: '5, 5',
                            }}
                        />
                    ))}
                </MapContainer>
            </div>

            <div className="map-legend">
                <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }}></span> Radar IDEAM</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }}></span> Ciudad consultada</div>
                <div className="legend-item"><span className="legend-dot" style={{ background: 'rgba(0,100,255,0.4)' }}></span> Precipitación OWM</div>
            </div>
        </div>
    );
}
