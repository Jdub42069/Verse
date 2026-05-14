import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  coordinates: LocationCoordinates;
  address?: string;
}

export class LocationService {
  static async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  static async checkPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  static async getCurrentLocation(): Promise<LocationResult | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinates: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      let address: string | undefined;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync(coordinates);
        if (reverseGeocode.length > 0) {
          const geo = reverseGeocode[0];
          const parts = [geo.city, geo.region, geo.country].filter(Boolean);
          address = parts.join(', ');
        }
      } catch (error) {
        console.error('Error reverse geocoding:', error);
      }

      return {
        coordinates,
        address,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  static formatLocationDisplay(
    location: string | null,
    latitude: number | null,
    longitude: number | null
  ): string {
    if (location && location.trim()) {
      return location;
    }

    if (latitude && longitude) {
      return `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    }

    return 'Location not set';
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3958.8;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
