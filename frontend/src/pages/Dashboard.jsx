import { useState, useEffect } from 'react';
import './Dashboard.css';
import { useAuth } from '../context/AuthContext';
import WeatherHero from '../components/WeatherHero';
import WeatherTabs from '../components/WeatherTabs';
import WeatherMap from '../components/WeatherMap';
import SkeletonLoader from '../components/SkeletonLoader';

function Dashboard() {
  const { user, token, logout } = useAuth();
  const [status, setStatus] = useState('Verificando...');
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [radares, setRadares] = useState([]);
  const [mapCenter, setMapCenter] = useState([4.7110, -74.0721]); // Bogotá default
  const [mapZoom, setMapZoom] = useState(6);
  const [showRadarCoverage, setShowRadarCoverage] = useState(true);

  // Autocomplete states
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Health check
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setStatus(data.status === 'healthy' ? 'Conectado ✅' : 'Error ❌'))
      .catch(() => setStatus('Desconectado ❌'));

    // Load IDEAM radars (Requires Token)
    fetch('/api/consultas/ideam/radares', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setRadares(data.radares || []))
      .catch(err => console.error('Error loading radars:', err));
  }, [token]);

  // Improvement 8: City Autocomplete with Debounce logic
  useEffect(() => {
    if (city.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=5&language=es&format=json`);
        const data = await res.json();
        if (data.results) {
          setSuggestions(data.results.map(r => ({
            name: r.name,
            admin1: r.admin1,
            country: r.country,
            lat: r.latitude,
            lon: r.longitude
          })));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [city]);

  const handleSearch = async (cityToSearch) => {
    const searchVal = typeof cityToSearch === 'string' ? cityToSearch : city;
    if (!searchVal.trim()) return;

    setLoading(true);
    setError('');
    setWeather(null);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/consultas/tiempo-real', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ciudad: searchVal }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al obtener datos');
      }

      const data = await response.json();
      setWeather(data);

      if (data.coordenadas) {
        setMapCenter([data.coordenadas.latitude, data.coordenadas.longitude]);
        setMapZoom(10);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (s) => {
    setCity(s.name);
    setSuggestions([]);
    setShowSuggestions(false);
    handleSearch(s.name);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>🌦️ ClimaGuru</h1>
          <span className="tagline">Hola, {user?.nombre_completo || user?.username}</span>
        </div>
        <div className="header-right">
          <span className={`status-badge ${status.includes('Conectado') ? 'ok' : 'err'}`}>
            {status}
          </span>
          <button className="logout-button" onClick={logout}>Salir 🚪</button>
        </div>
      </header>

      <div className="main-layout">
        <div className="left-panel">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="search-bar">
            <input
              type="text"
              placeholder="🔍 Ciudad (ej: Bogotá, Medellín, Madrid)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              disabled={loading}
              autoComplete="off"
            />
            <button type="submit" disabled={loading || !city.trim()}>
              {loading ? '⏳' : '🔍'}
            </button>

            {showSuggestions && suggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {suggestions.map((s, i) => (
                  <div key={i} className="autocomplete-item" onClick={() => handleSuggestionClick(s)}>
                    <span className="city-name">{s.name}</span>
                    <span className="country-name">{s.admin1 ? `${s.admin1}, ` : ''}{s.country}</span>
                  </div>
                ))}
              </div>
            )}
          </form>

          {error && <div className="error-alert">⚠️ {error}</div>}

          {loading && <SkeletonLoader />}

          {weather && !loading && (
            <div className="weather-panel">
              <WeatherHero weather={weather} />
              <WeatherTabs weather={weather} />
            </div>
          )}

          {!weather && !loading && !error && (
            <div className="welcome">
              <div className="welcome-icon">🌍</div>
              <h3>Bienvenido a ClimaGuru</h3>
              <p>Consulta el clima de cualquier ciudad con datos multi-API verificados.</p>
              <div className="api-logos">
                <span className="api-tag om">Open-Meteo</span>
                <span className="api-tag ow">OpenWeather</span>
                <span className="api-tag ms">Meteosource</span>
                <span className="api-tag mb">Meteoblue</span>
                <span className="api-tag id">IDEAM</span>
              </div>
            </div>
          )}
        </div>

        <WeatherMap
          weather={weather}
          radares={radares}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          showRadarCoverage={showRadarCoverage}
          onToggleCoverage={setShowRadarCoverage}
        />
      </div>
    </div>
  );
}

export default Dashboard;
