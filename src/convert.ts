import * as fs from 'node:fs';
import axios from 'axios';
import dotenv from 'dotenv-safe';
import places from '../places.json';

dotenv.config();

// Replace this with your actual API key
const { GOOGLE_MAPS_API_KEY } = process.env;
if (!GOOGLE_MAPS_API_KEY) {
  throw new Error('GOOGLE_MAPS_API_KEY is not set');
}

// Type definitions
interface OpeningHours {
  Monday: string[];
  Tuesday: string[];
  Wednesday: string[];
  Thursday: string[];
  Friday: string[];
  Saturday: string[];
  Sunday: string[];
}

interface Place {
  name: string;
  openingHours: OpeningHours;
  address: string;
}

interface EnrichedPlace extends Place {
  lat: number | null;
  lon: number | null;
}

interface GeocodeResult {
  address: string;
  lat: number | null;
  lon: number | null;
}

interface GoogleAutocompleteResponse {
  predictions: Array<{
    description: string;
    place_id: string;
  }>;
  status: string;
}

interface GoogleGeocodeResponse {
  error_message?: string;
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
  status: string;
}

// Function to get autocomplete suggestion (optional, can be skipped for Geocoding directly)
async function autocompleteAddress(input: string): Promise<string> {
  const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  const params = {
    input: `Bologna ${input}`,
    types: 'address',
    key: GOOGLE_MAPS_API_KEY,
    language: 'it',
    components: 'country:IT',
  };

  const res = await axios.get<GoogleAutocompleteResponse>(url, { params });

  if (res.data.predictions.length > 0) {
    return res.data.predictions[0].description;
  }
  return input;
}

// Function to get lat/lon from address
async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const url = 'https://maps.googleapis.com/maps/api/geocode/json';
  const params = {
    address,
    key: GOOGLE_MAPS_API_KEY,
  };

  const res = await axios.get<GoogleGeocodeResponse>(url, { params });

  console.log(res.data);

  if (res.data.status !== 'OK') {
    throw new Error(
      `Geocode error for "${address}": ${res.data.error_message}`,
    );
  }

  if (res.data.results.length > 0) {
    const location = res.data.results[0].geometry.location;
    const formatted = res.data.results[0].formatted_address;
    return {
      address: formatted,
      lat: location.lat,
      lon: location.lng,
    };
  }
  return { address, lat: null, lon: null };
}

// Main process
async function enrichPlaces(data: Place[]): Promise<void> {
  const enriched: EnrichedPlace[] = [];

  for (const place of data) {
    try {
      console.log(`Processing ${place.name} (${place.address})...`);

      const fullAddress = await autocompleteAddress(place.address);
      console.log(
        `Got autocomplete suggestion for ${place.name}: ${fullAddress}`,
      );

      const geo = await geocodeAddress(fullAddress);
      if (!geo.lat || !geo.lon) {
        throw new Error(
          `Could not get coordinates for address: ${fullAddress}`,
        );
      }

      enriched.push({
        ...place,
        address: geo.address,
        lat: geo.lat,
        lon: geo.lon,
      });

      console.log(
        `Successfully processed ${place.name}: ${geo.address} (${geo.lat}, ${geo.lon})`,
      );
    } catch (err) {
      console.error('❌ Error occurred while processing places:');
      console.error(`Place: ${place.name}`);
      console.error(`Address: ${place.address}`);
      console.error(`Error: ${(err as Error).message || err}`);
      console.error('Stack trace:');
      console.error((err as Error).stack || 'No stack trace available');
      process.exit(1); // Exit immediately on any error
    }
  }

  fs.writeFileSync('enriched_places.json', JSON.stringify(enriched, null, 2));
  console.log('✅ Enriched data saved to enriched_places.json');
}

// Type assertion for imported places data
const typedPlaces = places as Place[];

enrichPlaces(typedPlaces);
