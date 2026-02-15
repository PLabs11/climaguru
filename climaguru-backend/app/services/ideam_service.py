"""
IDEAM Radar Service
===================
Expone información de estaciones radar IDEAM de Colombia.
Datos disponibles vía AWS Open Data (bucket s3-radaresideam).
"""

# Información de radares IDEAM disponibles en AWS
RADARES_IDEAM = {
    'Barrancabermeja': {
        'codigo': 'BAR',
        'ubicacion': 'Barrancabermeja, Santander',
        'lat': 7.0653,
        'lon': -73.8547,
        'descripcion': 'Radar meteorológico Barrancabermeja',
        'cobertura_km': 240,
        'tipo': 'Banda C',
        'estado': 'activo',
    },
    'Guaviare': {
        'codigo': 'GUA',
        'ubicacion': 'San José del Guaviare',
        'lat': 2.5694,
        'lon': -72.6411,
        'descripcion': 'Radar meteorológico Guaviare',
        'cobertura_km': 240,
        'tipo': 'Banda C',
        'estado': 'activo',
    },
    'Munchique': {
        'codigo': 'MUN',
        'ubicacion': 'Popayán, Cauca',
        'lat': 2.5458,
        'lon': -76.9631,
        'descripcion': 'Radar meteorológico Munchique',
        'cobertura_km': 240,
        'tipo': 'Banda C',
        'estado': 'activo',
    },
    'Carimagua': {
        'codigo': 'CAR',
        'ubicacion': 'Puerto Gaitán, Meta',
        'lat': 4.5694,
        'lon': -71.3292,
        'descripcion': 'Radar meteorológico Carimagua',
        'cobertura_km': 240,
        'tipo': 'Banda C',
        'estado': 'activo',
    },
}


def get_all_radares():
    """Retorna lista de todos los radares IDEAM con info para el mapa"""
    result = []
    for nombre, info in RADARES_IDEAM.items():
        result.append({
            'nombre': nombre,
            'codigo': info['codigo'],
            'ubicacion': info['ubicacion'],
            'lat': info['lat'],
            'lon': info['lon'],
            'descripcion': info['descripcion'],
            'cobertura_km': info['cobertura_km'],
            'tipo': info['tipo'],
            'estado': info['estado'],
            'datos_fuente': 'AWS Open Data (s3-radaresideam)',
            'delay': '24 horas',
        })
    return result


def get_radar_by_name(nombre: str):
    """Busca un radar por nombre"""
    for key, info in RADARES_IDEAM.items():
        if key.lower() == nombre.lower() or info['codigo'].lower() == nombre.lower():
            return {**info, 'nombre': key}
    return None
