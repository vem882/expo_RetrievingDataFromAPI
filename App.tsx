import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { WeatherService } from './services/weatherService';
import { WeatherResponse } from './types/weather';

// Muista asettaa EXPO_PUBLIC_OPENWEATHER_API_KEY .env tiedostoo, esimerkki envi löytyy juuresta .env.example 
const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || '';

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const weatherService = new WeatherService(API_KEY);

  useEffect(() => {
    loadWeatherData();
  }, []);

  const loadWeatherData = async () => {
    try {
      setError('');
      
      // Validoi API-avain
      if (!API_KEY) {
        setError('API avain puuttuu!');
        setLoading(false);
        return;
      }

      // Tarkista nykyiset sijaintioikeudet
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      //console.log('Nykyinen sijaintioikeuden tila:', existingStatus);
      
      let finalStatus = existingStatus;
      
      // Jos oikeutta ei ole vielä myönnetty, pyydä sitä
      if (existingStatus !== 'granted') {
        //console.log('Pyydetään sijaintioikeutta...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
        //console.log('Sijaintioikeuden pyyntö vastaus:', status);
      }
      
      if (finalStatus !== 'granted') {
        setError('Sijainnin käyttöoikeus puuttuu. Sovellus tarvitsee sijainnin näyttääkseen sään.');
        setLoading(false);
        return;
      }

      //console.log('Haetaan sijaintia...');
      // Hae nykyinen sijainti
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      //console.log('Sijainti haettu:', currentLocation.coords);
      setLocation(currentLocation);

      //console.log('Haetaan säätietoja...');
      // Hae säätiedot rajapinnasta puhelimen sijainnin perusteella
      const weatherData = await weatherService.getWeatherByCoordinates(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        'metric',
        'fi'
      );
      //console.log('Säätiedot haettu:', weatherData.name);
      setWeather(weatherData);
    } catch (err) {
      console.error('Virhe:', err);
      setError(err instanceof Error ? err.message : 'Tuntematon virhe tapahtui');
      Alert.alert('Virhe', err instanceof Error ? err.message : 'Tuntematon virhe tapahtui');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWeatherData();
  };

  const formatTemperature = (temp: number): string => {
    return `${Math.round(temp)}°C`;
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Ladataan säätietoja...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.container}>
        <StatusBar style="auto" />

        {weather && (
          <>
            {/* Kaupunki ja maa */}
            <Text style={styles.cityName}>
              {weather.name}, {weather.sys.country}
            </Text>

            {/* Säätila ja ikoni */}
            <View style={styles.weatherIconContainer}>
              {weather.weather[0]?.icon && (
                <Image
                  source={{ uri: WeatherService.getWeatherIconUrl(weather.weather[0].icon) }}
                  style={styles.weatherIcon}
                />
              )}
              <Text style={styles.weatherDescription}>
                {weather.weather[0]?.description}
              </Text>
            </View>

            {/* Lämpötila */}
            <Text style={styles.temperature}>
              {formatTemperature(weather.main.temp)}
            </Text>

            <Text style={styles.feelsLike}>
              Tuntuu kuin {formatTemperature(weather.main.feels_like)}
            </Text>

            {/* Yksityiskohtaiset tiedot */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Min / Max:</Text>
                <Text style={styles.detailValue}>
                  {formatTemperature(weather.main.temp_min)} / {formatTemperature(weather.main.temp_max)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kosteus:</Text>
                <Text style={styles.detailValue}>{weather.main.humidity}%</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ilmanpaine:</Text>
                <Text style={styles.detailValue}>{weather.main.pressure} hPa</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tuuli:</Text>
                <Text style={styles.detailValue}>
                  {weather.wind.speed} m/s
                  {weather.wind.gust && ` (puuskat ${weather.wind.gust} m/s)`}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pilvisyys:</Text>
                <Text style={styles.detailValue}>{weather.clouds.all}%</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Näkyvyys:</Text>
                <Text style={styles.detailValue}>{(weather.visibility / 1000).toFixed(1)} km</Text>
              </View>

              {weather.rain?.['1h'] && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sade (1h):</Text>
                  <Text style={styles.detailValue}>{weather.rain['1h']} mm</Text>
                </View>
              )}

              {weather.snow?.['1h'] && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Lumi (1h):</Text>
                  <Text style={styles.detailValue}>{weather.snow['1h']} mm</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Auringonnousu:</Text>
                <Text style={styles.detailValue}>{formatTime(weather.sys.sunrise)}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Auringonlasku:</Text>
                <Text style={styles.detailValue}>{formatTime(weather.sys.sunset)}</Text>
              </View>
            </View>

            {/* Koordinaatit */}
            {location && (
              <Text style={styles.coordinates}>
                📍 {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
              </Text>
            )}

            <Text style={styles.updateInfo}>
              Päivitetty: {formatTime(weather.dt)}
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  cityName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 10,
    color: '#333',
  },
  weatherIconContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  weatherIcon: {
    width: 120,
    height: 120,
  },
  weatherDescription: {
    fontSize: 20,
    color: '#555',
    textTransform: 'capitalize',
    marginTop: -10,
  },
  temperature: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#0066cc',
    marginVertical: 10,
  },
  feelsLike: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  coordinates: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },
  updateInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    marginBottom: 20,
  },
});
