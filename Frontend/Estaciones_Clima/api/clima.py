import os
import requests
from flask_restful import Resource
from dotenv import load_dotenv
from models import Estacion

# Cargar variables de entorno desde el directorio raíz del proyecto
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

class ClimaEstacion(Resource):
    """Endpoint para obtener datos climáticos de una estación"""
    
    def get(self, id):
        # 1. Obtener la estación de la base de datos
        estacion = Estacion.query.get_or_404(id)
        lat = estacion.latitud
        lon = estacion.longitud
        nombre = estacion.nombre
        
        resultado = {
            "estacion": {
                "id": estacion.id,
                "nombre": nombre,
                "latitud": lat,
                "longitud": lon
            },
            "fuentes": []
        }
        
        # 2. Intentar Open-Meteo (gratuito, sin API key)
        openmeteo_data = self._consultar_openmeteo(lat, lon)
        if openmeteo_data:
            resultado["fuentes"].append({
                "nombre": "Open-Meteo",
                "datos": openmeteo_data
            })
        
        # 3. Intentar OpenWeatherMap
        openweather_data = self._consultar_openweather(lat, lon)
        if openweather_data:
            resultado["fuentes"].append({
                "nombre": "OpenWeatherMap",
                "datos": openweather_data
            })
        
        # 4. Intentar Meteosource
        meteosource_data = self._consultar_meteosource(lat, lon)
        if meteosource_data:
            resultado["fuentes"].append({
                "nombre": "Meteosource",
                "datos": meteosource_data
            })
        
        if not resultado["fuentes"]:
            return {"message": "No se pudieron obtener datos del clima de ninguna fuente", "estacion": resultado["estacion"]}, 503
        
        return resultado, 200
    
    def _consultar_openmeteo(self, lat, lon):
        """Consulta Open-Meteo API (gratuita, sin API key)"""
        try:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
                "timezone": "America/Bogota"
            }
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                current = data.get("current", {})
                return {
                    "temperatura": current.get("temperature_2m"),
                    "sensacion_termica": current.get("apparent_temperature"),
                    "humedad": current.get("relative_humidity_2m"),
                    "precipitacion": current.get("precipitation"),
                    "viento_velocidad": current.get("wind_speed_10m"),
                    "viento_direccion": current.get("wind_direction_10m"),
                    "codigo_clima": current.get("weather_code"),
                    "unidades": {
                        "temperatura": "°C",
                        "humedad": "%",
                        "precipitacion": "mm",
                        "viento": "km/h"
                    }
                }
        except Exception as e:
            print(f"Error Open-Meteo: {e}")
        return None
    
    def _consultar_openweather(self, lat, lon):
        """Consulta OpenWeatherMap API"""
        try:
            api_key = os.getenv("OPENWEATHER_API_KEY")
            if not api_key:
                return None
            
            url = "https://api.openweathermap.org/data/2.5/weather"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": api_key,
                "units": "metric",
                "lang": "es"
            }
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                main = data.get("main", {})
                wind = data.get("wind", {})
                weather = data.get("weather", [{}])[0]
                return {
                    "temperatura": main.get("temp"),
                    "sensacion_termica": main.get("feels_like"),
                    "humedad": main.get("humidity"),
                    "presion": main.get("pressure"),
                    "viento_velocidad": wind.get("speed"),
                    "descripcion": weather.get("description"),
                    "icono": weather.get("icon"),
                    "unidades": {
                        "temperatura": "°C",
                        "humedad": "%",
                        "presion": "hPa",
                        "viento": "m/s"
                    }
                }
        except Exception as e:
            print(f"Error OpenWeather: {e}")
        return None
    
    def _consultar_meteosource(self, lat, lon):
        """Consulta Meteosource API"""
        try:
            api_key = os.getenv("METEOSOURCE_API_KEY")
            if not api_key:
                return None
            
            url = f"{os.getenv('METEOSOURCE_BASE_URL', 'https://api.meteosource.com/v1/free')}/point"
            params = {
                "lat": lat,
                "lon": lon,
                "key": api_key,
                "sections": "current",
                "units": "metric"
            }
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                current = data.get("current", {})
                return {
                    "temperatura": current.get("temperature"),
                    "sensacion_termica": current.get("feels_like"),
                    "humedad": current.get("humidity"),
                    "nubosidad": current.get("cloud_cover"),
                    "viento_velocidad": current.get("wind", {}).get("speed"),
                    "viento_direccion": current.get("wind", {}).get("dir"),
                    "resumen": current.get("summary"),
                    "icono": current.get("icon"),
                    "unidades": {
                        "temperatura": "°C",
                        "humedad": "%",
                        "viento": "m/s"
                    }
                }
        except Exception as e:
            print(f"Error Meteosource: {e}")
        return None

from . import api
api.add_resource(ClimaEstacion, "/clima/<int:id>", endpoint="clima_estacion")
