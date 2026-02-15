/**
 * WeatherHero — Main temperature display card
 */
export default function WeatherHero({ weather }) {
    if (!weather?.resumen) return null;
    const { resumen, ciudad, total_fuentes } = weather;

    return (
        <div className="summary-hero">
            <h2>{ciudad}</h2>
            <div className="hero-temp">{resumen.temperatura ?? '--'}°C</div>
            <div className="hero-desc">{resumen.descripcion || 'Sin descripción'}</div>
            <div className="hero-stats">
                <span>💧 {resumen.humedad ?? '--'}%</span>
                <span>💨 {resumen.viento ?? '--'} km/h</span>
                <span>📊 {resumen.presion ?? '--'} hPa</span>
            </div>
            <div className="source-count">
                {total_fuentes} fuente{total_fuentes !== 1 ? 's' : ''} activa{total_fuentes !== 1 ? 's' : ''}
            </div>
        </div>
    );
}
