import axios from 'axios';
import { WeatherResponse } from '../types/weather';

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export class WeatherService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Hakee säätiedot saatujen koordinaattien perusteella
   * @param latitude 
   * @param longitude 
   * @param units )
   * @param lang 
   * @returns WeatherResponse objecti
   */
  async getWeatherByCoordinates(
    latitude: number,
    longitude: number,
    units: 'metric' | 'imperial' | 'standard' = 'metric',
    lang: string = 'fi'
  ): Promise<WeatherResponse> {
    try {
      const response = await axios.get<WeatherResponse>(
        `${BASE_URL}/weather`,
        {
          params: {
            lat: latitude,
            lon: longitude,
            appid: this.apiKey,
            units,
            lang,
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Säätietojen haku epäonnistui: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Muutetaan Kelvinit Celsius-asteeksi, koska rajapinta antaa kelveneissä.
   * @param kelvin 
   * @returns Palautetaan asteen oikeassa muodossa.
   */
  static kelvinToCelsius(kelvin: number): number {
    return kelvin - 273.15;
  }

  /**
   * Määritetään sään mukainen kuvake rajapinnasta saadun datan mukaan.
   * @param iconCode ikonin koodi rajapinnasta
   * @returns 
   */
  static getWeatherIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }
}
