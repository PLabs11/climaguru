import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeatherHero from '../src/components/WeatherHero';
import React from 'react';

describe('WeatherHero Component', () => {
    it('renders city and temperature correctly', () => {
        const mockWeather = {
            ciudad: 'Bogotá',
            resumen: {
                temperatura: 20,
                descripcion: 'Soleado',
                humedad: 50,
                viento: 10,
                presion: 1013
            },
            total_fuentes: 1
        };

        render(<WeatherHero weather={mockWeather} />);

        expect(screen.getByText('Bogotá')).toBeDefined();
        expect(screen.getByText('20°C')).toBeDefined();
        expect(screen.getByText('Soleado')).toBeDefined();
        expect(screen.getByText('💧 50%')).toBeDefined();
    });

    it('renders nothing if weather data is missing', () => {
        const { container } = render(<WeatherHero weather={null} />);
        expect(container.firstChild).toBeNull();
    });
});
