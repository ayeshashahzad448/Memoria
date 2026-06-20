import type { StarLocation } from '@/lib/types';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export interface PlacePrediction {
  placeId: string;
  primary: string;
  secondary: string;
}

export const placesEnabled = Boolean(API_KEY);

/**
 * Google Places Autocomplete (New). Returns a small list of place predictions.
 * Falls back to an empty list when no key is configured or the request fails.
 */
export async function searchPlaces(query: string): Promise<PlacePrediction[]> {
  const q = query.trim();
  if (!API_KEY || q.length < 2) return [];

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify({ input: q }),
    });
    if (!res.ok) return [];
    const raw: unknown = await res.json();
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing from unknown to typed API response shape
    const data = raw as {
      suggestions?: {
        placePrediction?: {
          placeId: string;
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
          text?: { text?: string };
        };
      }[];
    };
    return (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        placeId: p.placeId,
        primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? 'Place',
        secondary: p.structuredFormat?.secondaryText?.text ?? '',
      }));
  } catch {
    return [];
  }
}

/** Resolve a selected prediction to coordinates. */
export async function resolvePlace(prediction: PlacePrediction): Promise<StarLocation> {
  const base: StarLocation = {
    name: [prediction.primary, prediction.secondary].filter(Boolean).join(', '),
    placeId: prediction.placeId,
  };
  if (!API_KEY) return base;

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${prediction.placeId}`, {
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'location,displayName',
      },
    });
    if (!res.ok) return base;
    const raw: unknown = await res.json();
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing from unknown to typed API response shape
    const data = raw as {
      location?: { latitude?: number; longitude?: number };
    };
    return {
      ...base,
      lat: data.location?.latitude,
      lng: data.location?.longitude,
    };
  } catch {
    return base;
  }
}
