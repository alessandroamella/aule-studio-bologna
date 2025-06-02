import * as fs from 'node:fs';
import axios, { isAxiosError } from 'axios';
import dotenv from 'dotenv-safe';
import places from '../places.json';

dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface Place {
  name: string;
  openingHours: string;
  address: string;
}

interface EnrichedPlace extends Place {
  lat: number | null;
  lon: number | null;
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      text?: {
        text?: string;
      };
      placeId?: string;
    };
  }>;
}

interface GeocodeResponse {
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
}

interface GeocodeResult {
  address: string;
  lat: number | null;
  lon: number | null;
}

async function autocompleteNew(input: string): Promise<string> {
  try {
    const res = await axios.post<AutocompleteResponse>(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        input: input,
        includedRegionCodes: ['IT'],
        includeQueryPredictions: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask':
            'suggestions.placePrediction.text.text,suggestions.placePrediction.placeId',
        },
      },
    );

    const suggestions = res.data?.suggestions || [];
    const bestMatch = suggestions.find((s) => s.placePrediction?.text?.text);
    return bestMatch?.placePrediction?.text?.text || input;
  } catch (err) {
    if (isAxiosError(err)) {
      console.error(
        `Autocomplete error for "${input}":`,
        err.response?.data || err.message,
      );
    } else {
      console.error(`Autocomplete error for "${input}":`, err);
    }
    return input;
  }
}

async function geocodeAddress(address: string): Promise<GeocodeResult> {
  try {
    const res = await axios.get<GeocodeResponse>(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address,
          key: GOOGLE_MAPS_API_KEY,
        },
      },
    );

    if (res.data.results.length > 0) {
      const loc = res.data.results[0].geometry.location;
      const formatted = res.data.results[0].formatted_address;
      return {
        address: formatted,
        lat: loc.lat,
        lon: loc.lng,
      };
    }

    return { address, lat: null, lon: null };
  } catch (err) {
    if (isAxiosError(err)) {
      console.error(
        `Geocode error for "${address}":`,
        err.response?.data || err.message,
      );
    } else {
      console.error(`Geocode error for "${address}":`, err);
    }
    return { address, lat: null, lon: null };
  }
}

async function enrichPlaces(placesList: Place[]): Promise<void> {
  const enriched: EnrichedPlace[] = [];

  for (const place of placesList) {
    console.log(`🔍 Processing: ${place.name}`);
    const fullAddress = await autocompleteNew(place.address);
    const geo = await geocodeAddress(fullAddress);

    enriched.push({
      ...place,
      address: geo.address,
      lat: geo.lat,
      lon: geo.lon,
    });
  }

  fs.writeFileSync('enriched_places.json', JSON.stringify(enriched, null, 2));
  console.log('✅ Saved to enriched_places.json');
}

enrichPlaces(places);
