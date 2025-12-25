import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Weather data from Open-Meteo API
 */
export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  precipitation: number;
  uvIndex: number;
  isDay: boolean;
}

export interface WeatherForecast {
  current: WeatherData;
  daily: DailyForecast[];
}

export interface DailyForecast {
  date: Date;
  tempMax: number;
  tempMin: number;
  description: string;
  icon: string;
  precipitationProbability: number;
}

/**
 * WeatherService - Real-time weather data from Open-Meteo
 * 
 * Free API, no key required!
 * Docs: https://open-meteo.com/en/docs
 */
@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private http = inject(HttpClient);
  private baseUrl = environment.apis.openMeteo;

  /**
   * Get current weather for a location
   */
  getCurrentWeather(lat: number, lon: number): Observable<WeatherData> {
    const url = `${this.baseUrl}/forecast`;
    const params = {
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
        'is_day'
      ].join(','),
      timezone: 'auto'
    };

    return this.http.get<OpenMeteoResponse>(url, { params }).pipe(
      map(response => this.mapCurrentWeather(response)),
      catchError(error => {
        console.error('Weather API error:', error);
        return of(this.getDefaultWeather());
      })
    );
  }

  /**
   * Get weather forecast for next 7 days
   */
  getWeatherForecast(lat: number, lon: number): Observable<WeatherForecast> {
    const url = `${this.baseUrl}/forecast`;
    const params = {
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
        'is_day'
      ].join(','),
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'weather_code',
        'precipitation_probability_max',
        'uv_index_max'
      ].join(','),
      timezone: 'auto',
      forecast_days: '7'
    };

    return this.http.get<OpenMeteoResponse>(url, { params }).pipe(
      map(response => ({
        current: this.mapCurrentWeather(response),
        daily: this.mapDailyForecast(response)
      })),
      catchError(error => {
        console.error('Weather API error:', error);
        return of({
          current: this.getDefaultWeather(),
          daily: []
        });
      })
    );
  }

  private mapCurrentWeather(response: OpenMeteoResponse): WeatherData {
    const current = response.current;
    const weatherCode = current.weather_code;

    return {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      description: this.getWeatherDescription(weatherCode),
      icon: this.getWeatherIcon(weatherCode, current.is_day === 1),
      windSpeed: Math.round(current.wind_speed_10m),
      precipitation: current.precipitation,
      uvIndex: 0,
      isDay: current.is_day === 1
    };
  }

  private mapDailyForecast(response: OpenMeteoResponse): DailyForecast[] {
    const daily = response.daily;
    if (!daily) return [];

    return daily.time.map((date, index) => ({
      date: new Date(date),
      tempMax: Math.round(daily.temperature_2m_max[index]),
      tempMin: Math.round(daily.temperature_2m_min[index]),
      description: this.getWeatherDescription(daily.weather_code[index]),
      icon: this.getWeatherIcon(daily.weather_code[index], true),
      precipitationProbability: daily.precipitation_probability_max[index]
    }));
  }

  private getWeatherDescription(code: number): string {
    const descriptions: Record<number, string> = {
      0: 'Sereno',
      1: 'Prevalentemente sereno',
      2: 'Parzialmente nuvoloso',
      3: 'Nuvoloso',
      45: 'Nebbia',
      48: 'Nebbia con brina',
      51: 'Pioggerella leggera',
      53: 'Pioggerella moderata',
      55: 'Pioggerella intensa',
      61: 'Pioggia leggera',
      63: 'Pioggia moderata',
      65: 'Pioggia intensa',
      71: 'Neve leggera',
      73: 'Neve moderata',
      75: 'Neve intensa',
      77: 'Granelli di neve',
      80: 'Rovesci leggeri',
      81: 'Rovesci moderati',
      82: 'Rovesci violenti',
      85: 'Nevicate leggere',
      86: 'Nevicate intense',
      95: 'Temporale',
      96: 'Temporale con grandine leggera',
      99: 'Temporale con grandine'
    };
    return descriptions[code] || 'Variabile';
  }

  private getWeatherIcon(code: number, isDay: boolean): string {
    // Map weather codes to emoji icons
    if (code === 0) return isDay ? '☀️' : '🌙';
    if (code === 1) return isDay ? '🌤️' : '🌙';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 55) return '🌧️';
    if (code >= 61 && code <= 65) return '🌧️';
    if (code >= 71 && code <= 77) return '🌨️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 85 && code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '🌡️';
  }

  private getDefaultWeather(): WeatherData {
    return {
      temperature: 20,
      feelsLike: 20,
      humidity: 50,
      description: 'Dati non disponibili',
      icon: '🌡️',
      windSpeed: 0,
      precipitation: 0,
      uvIndex: 0,
      isDay: true
    };
  }
}

// Open-Meteo API Response types
interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_probability_max: number[];
    uv_index_max: number[];
  };
}

