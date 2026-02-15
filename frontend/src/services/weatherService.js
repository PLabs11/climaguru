/**
 * Servicio para interactuar con la API de clima
 */

export const weatherService = {
    /**
     * Consultar clima en tiempo real (multi-API)
     * @param {string} ciudad - Nombre de la ciudad
     * @returns {Promise<Object>} - Datos del clima de múltiples fuentes
     */
    getWeather: async (ciudad) => {
        const response = await fetch('/api/consultas/tiempo-real', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ciudad }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al obtener datos');
        }

        return response.json();
    },

    /**
     * Obtener estaciones radar IDEAM
     * @returns {Promise<Object>} - Lista de radares
     */
    getIDEAMRadares: async () => {
        const response = await fetch('/api/consultas/ideam/radares');
        if (!response.ok) throw new Error('Error al obtener radares IDEAM');
        return response.json();
    },
};
