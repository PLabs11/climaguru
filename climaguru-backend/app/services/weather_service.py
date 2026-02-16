"""
Servicio Agregador de Clima
===========================
Integra múltiples APIs meteorológicas y promedia sus resultados.
Implementa caché por TTL y logging estructurado.
"""
import os
import requests
import logging
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any, Optional
from cachetools import TTLCache

# Configuración de logging
LOG_DIR = os.path.join(os.getcwd(), 'logs')
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, "weather_service.log"), encoding='utf-8')
    ]
)
logger = logging.getLogger("WeatherAggregator")

# --- Clientes de API ---
class WeatherClient:
    def __init__(self, name: str):
        self.name = name
    def get_weather(self, lat: float, lon: float, city: str = "") -> Optional[Dict[str, Any]]:
        raise NotImplementedError

class OpenWeatherClient(WeatherClient):
    def __init__(self, api_key: str):
        super().__init__("openweathermap")
        self.api_key = api_key
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"
        self.air_url = "https://api.openweathermap.org/data/2.5/air_pollution"

    def get_weather(self, lat: float, lon: float, city: str = "") -> Optional[Dict[str, Any]]:
        if not self.api_key: return None
        try:
            params = {"lat": lat, "lon": lon, "appid": self.api_key, "units": "metric", "lang": "es"}
            r = requests.get(self.base_url, params=params, timeout=5)
            r.raise_for_status()
            data = r.json()
            return {
                "fuente": "OpenWeatherMap",
                "temperatura": data["main"]["temp"],
                "humedad": data["main"]["humidity"],
                "viento_velocidad": data["wind"]["speed"] * 3.6, # m/s to km/h
                "presion": data["main"]["pressure"],
                "descripcion": data["weather"][0]["description"],
                "amanecer": datetime.fromtimestamp(data["sys"]["sunrise"]).strftime("%H:%M"),
                "atardecer": datetime.fromtimestamp(data["sys"]["sunset"]).strftime("%H:%M"),
            }
        except Exception as e:
            logger.error(f"[OpenWeather] Error: {e}")
            return None

    def get_air_quality(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        if not self.api_key: return None
        try:
            params = {"lat": lat, "lon": lon, "appid": self.api_key}
            r = requests.get(self.air_url, params=params, timeout=5)
            r.raise_for_status()
            data = r.json()["list"][0]
            aqi_labels = {1: "Excelente", 2: "Bueno", 3: "Moderado", 4: "Pobre", 5: "Muy Pobre"}
            return {
                "aqi": data["main"]["aqi"],
                "aqi_label": aqi_labels.get(data["main"]["aqi"], "N/A"),
                "componentes": data["components"]
            }
        except Exception as e:
            logger.error(f"[OpenWeather] Air pollution error: {e}")
            return None

class MeteosourceClient(WeatherClient):
    def __init__(self, api_key: str):
        super().__init__("meteosource")
        self.api_key = api_key
        self.base_url = "https://www.meteosource.com/api/v1/free/point"

    def get_weather(self, lat: float, lon: float, city: str = "") -> Optional[Dict[str, Any]]:
        if not self.api_key: return None
        try:
            # Meteosource free usa place_id o lat/lon. Usamos place_id si lo tenemos o lat/lon
            place_id = city.lower() or f"{lat},{lon}"
            params = {"key": self.api_key, "place_id": place_id, "sections": "current", "language": "es"}
            r = requests.get(self.base_url, params=params, timeout=5)
            r.raise_for_status()
            data = r.json()["current"]
            return {
                "fuente": "Meteosource",
                "temperatura": data["temperature"],
                "humedad": None, # No disponible en free point a veces
                "viento_velocidad": data["wind"]["speed"],
                "presion": data["pressure"],
                "descripcion": data["summary"],
            }
        except Exception as e:
            logger.error(f"[Meteosource] Error: {e}")
            return None

class OpenMeteoLocalClient(WeatherClient):
    def __init__(self):
        super().__init__("open_meteo")
        self.base_url = "https://api.open-meteo.com/v1/forecast"

    def get_weather(self, lat: float, lon: float, city: str = "") -> Optional[Dict[str, Any]]:
        try:
            params = {
                "latitude": lat, "longitude": lon,
                "current": ["temperature_2m", "relative_humidity_2m", "surface_pressure", "wind_speed_10m", "weather_code"],
                "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
                "timezone": "auto", "forecast_days": 7
            }
            r = requests.get(self.base_url, params=params, timeout=5)
            r.raise_for_status()
            data = r.json()
            curr = data["current"]
            
            # Mapeo simple de códigos WMO
            wmo_codes = {0: "Cielo despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado", 45: "Niebla", 51: "Llovizna ligera", 61: "Lluvia ligera", 80: "Chubascos ligeros"}
            
            return {
                "fuente": "Open-Meteo",
                "temperatura": curr["temperature_2m"],
                "humedad": curr["relative_humidity_2m"],
                "viento_velocidad": curr["wind_speed_10m"],
                "presion": curr["surface_pressure"],
                "descripcion": wmo_codes.get(curr["weather_code"], "Clima variable"),
                "pronostico_diario": [
                    {
                        "fecha": data["daily"]["time"][i],
                        "temp_max": data["daily"]["temperature_2m_max"][i],
                        "temp_min": data["daily"]["temperature_2m_min"][i],
                        "precipitacion": data["daily"]["precipitation_sum"][i],
                    } for i in range(len(data["daily"]["time"]))
                ]
            }
        except Exception as e:
            logger.error(f"[Open-Meteo] Error: {e}")
            return None

# --- Agregador ---
class WeatherAggregator:
    # Improvement 5: Caching with 5 min TTL
    def __init__(self):
        self.owm = OpenWeatherClient(os.getenv("OPENWEATHERMAP_API_KEY", ""))
        self.ms = MeteosourceClient(os.getenv("METEOSOURCE_API_KEY", ""))
        self.om = OpenMeteoLocalClient()
        self.clients = [self.owm, self.ms, self.om]
        
        # Geocoding cache
        self.geo_cache = TTLCache(maxsize=100, ttl=3600) # 1 hour for geocoding
        # Weather results cache
        self.weather_cache = TTLCache(maxsize=100, ttl=300) # 5 minutes for weather
        
        logger.info("WeatherAggregator inicializado con caching")

    def get_coordinates(self, city: str) -> Optional[Dict[str, float]]:
        if city in self.geo_cache:
            return self.geo_cache[city]
            
        try:
            # Fallback simple geocoding via Open-Meteo
            url = "https://geocoding-api.open-meteo.com/v1/search"
            r = requests.get(url, params={"name": city, "count": 1, "language": "es"}, timeout=5)
            data = r.json()
            if data.get("results"):
                res = {
                    "lat": data["results"][0]["latitude"],
                    "lon": data["results"][0]["longitude"],
                    "name": data["results"][0]["name"]
                }
                self.geo_cache[city] = res
                return res
        except Exception as e:
            logger.error(f"Error geocoding {city}: {e}")
        return None

    def get_all_weather(self, ciudad: str, lat: float = None, lon: float = None) -> Dict[str, Any]:
        # Support coordinates or city name
        if not lat or not lon:
            coords = self.get_coordinates(ciudad)
            if not coords:
                raise ValueError(f"No se pudo encontrar la ciudad: {ciudad}")
            lat, lon = coords["lat"], coords["lon"]
            ciudad = coords["name"]

        # Improvement 5: Check weather cache
        cache_key = f"{lat:.3f},{lon:.3f}"
        if cache_key in self.weather_cache:
            logger.info(f"Caché hit para {ciudad} ({cache_key})")
            return self.weather_cache[cache_key]

        logger.info(f"Consultando clima para {ciudad} ({lat}, {lon})")
        
        results = {}
        with ThreadPoolExecutor(max_workers=len(self.clients)) as executor:
            task_to_client = {executor.submit(c.get_weather, lat, lon, ciudad): c.name for c in self.clients}
            for future in as_completed(task_to_client):
                client_name = task_to_client[future]
                data = future.result()
                if data:
                    results[client_name] = data

        # Unificar calidad de aire
        air_quality = self.owm.get_air_quality(lat, lon)
        
        # Promediar resultados
        summary = self._calculate_summary(results)
        
        # Pronóstico (usamos Open-Meteo como base principal de pronóstico)
        pronostico = {"diario": results.get("open_meteo", {}).get("pronostico_diario", [])}

        final_result = {
            "ciudad": ciudad,
            "coordenadas": {"latitude": lat, "longitude": lon},
            "total_fuentes": len(results),
            "resumen": summary,
            "fuentes": results,
            "calidad_aire": air_quality,
            "pronostico": pronostico,
            "timestamp": datetime.now().isoformat()
        }
        
        # Cache result
        self.weather_cache[cache_key] = final_result
        return final_result

    def _calculate_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        temps = [r["temperatura"] for r in results.values() if r.get("temperatura") is not None]
        hums = [r["humedad"] for r in results.values() if r.get("humedad") is not None]
        winds = [r["viento_velocidad"] for r in results.values() if r.get("viento_velocidad") is not None]
        press = [r["presion"] for r in results.values() if r.get("presion") is not None]
        
        return {
            "temperatura": round(sum(temps) / len(temps), 1) if temps else None,
            "humedad": round(sum(hums) / len(hums)) if hums else None,
            "viento": round(sum(winds) / len(winds), 1) if winds else None,
            "presion": round(sum(press) / len(press)) if press else None,
            "descripcion": results.get("open_meteo", {}).get("descripcion") or results.get("openweathermap", {}).get("descripcion") or "N/A"
        }

    # Improvement 6: Key Validation
    def validate_keys(self) -> Dict[str, bool]:
        validations = {}
        # Test OWM (invalid lat/lon test)
        if self.owm.api_key:
            test_res = self.owm.get_weather(0, 0)
            validations["openweathermap"] = test_res is not None
        else:
            validations["openweathermap"] = False
            
        # Test Meteosource
        if self.ms.api_key:
            test_res = self.ms.get_weather(4.7, -74.0, "bogota")
            validations["meteosource"] = test_res is not None
        else:
            validations["meteosource"] = False
            
        validations["open_meteo"] = True # No key needed
        return validations