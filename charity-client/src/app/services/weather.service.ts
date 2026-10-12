import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/** A single daily forecast row returned by the Open-Meteo API. */
export interface WeatherDay {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbability: number;
  weatherCode: number;
}

/** The forecast response for an event, or null when no coordinates exist. */
export interface EventForecast {
  latitude: number;
  longitude: number;
  current: { temperature: number; weatherCode: number };
  daily: WeatherDay[];
}

/**
 * Retrieves weather for an event's venue from the free Open-Meteo API.
 *
 * Open-Meteo needs no API key and returns JSON, which makes it a good fit for
 * the assessment's dependency budget. The location's latitude and longitude are
 * stored on the locations table, so this service is only called when an event
 * actually has coordinates.
 */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast';

  constructor(private http: HttpClient) {}

  /**
   * Fetches current conditions plus a 7-day forecast for a coordinate pair.
   *
   * @param latitude - Decimal degrees, e.g. -27.966.
   * @param longitude - Decimal degrees, e.g. 153.410.
   * @returns An observable of the mapped forecast, or null when either
   *   coordinate is missing (the event simply shows no weather panel).
   */
  getForecast(latitude: number | null, longitude: number | null): Observable<EventForecast | null> {
    if (latitude == null || longitude == null) {
      return new Observable((subscriber) => {
        subscriber.next(null);
        subscriber.complete();
      });
    }

    const params = {
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,weather_code',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
      timezone: 'Australia/Brisbane',
      forecast_days: '7'
    };

    return this.http
      .get<any>(this.baseUrl, { params })
      .pipe(map((response) => this.mapResponse(response, latitude, longitude)));
  }

  private mapResponse(response: any, latitude: number, longitude: number): EventForecast {
    const daily = (response.daily?.time ?? []).map((date: string, index: number) => ({
      date,
      temperatureMax: response.daily.temperature_2m_max[index],
      temperatureMin: response.daily.temperature_2m_min[index],
      precipitationProbability: response.daily.precipitation_probability_max[index],
      weatherCode: response.daily.weather_code[index]
    }));

    return {
      latitude,
      longitude,
      current: {
        temperature: response.current?.temperature_2m ?? 0,
        weatherCode: response.current?.weather_code ?? 0
      },
      daily
    };
  }

  /** Maps a WMO weather code to a short human-readable label. */
  describeWeather(code: number): string {
    if (code === 0) return 'Clear sky';
    if (code <= 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code <= 48) return 'Fog';
    if (code <= 57) return 'Drizzle';
    if (code <= 67) return 'Rain';
    if (code <= 77) return 'Snow';
    if (code <= 82) return 'Rain showers';
    if (code <= 86) return 'Snow showers';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
  }
}
