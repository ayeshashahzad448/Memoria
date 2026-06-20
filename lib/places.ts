import type { StarLocation } from '@/lib/types';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export interface PlacePrediction {
  placeId: string;
  primary: string;
  secondary: string;
}

export interface PlacesResult {
  predictions: PlacePrediction[];
  /** Set when the request failed (vs. simply no matches). User-facing, plain language. */
  error?: string;
}

export const placesEnabled = Boolean(API_KEY);

/**
 * Google Places Autocomplete (New). Returns a small list of place predictions.
 *
 * NOTE: the `:autocomplete` endpoint does NOT accept an `X-Goog-FieldMask`
 * header — sending one returns HTTP 400. The autocomplete response shape is
 * fixed, so we only send the API key.
 */
export async function searchPlaces(query: string): Promise<PlacesResult> {
  const q = query.trim();
  if (!API_KEY) return { predictions: [], error: 'Location search is not configured.' };
  if (q.length < 2) return { predictions: [] };

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
      body: JSON.stringify({ input: q }),
    });
    if (!res.ok) {
      let detail = '';
      try {
        const errRaw: unknown = await res.json();
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing error body
        const errBody = errRaw as { error?: { message?: string } };
        detail = errBody.error?.message ?? '';
      } catch {
        /* ignore parse failure */
      }
      const lower = detail.toLowerCase();
      // Google returns this when the Places API (New) is not enabled / billing is off
      // for the project. Translate the wall of text into a plain instruction.
      if (
        res.status === 403 ||
        lower.includes('has not been used') ||
        lower.includes('is disabled') ||
        lower.includes('permission_denied') ||
        lower.includes('billing')
      ) {
        return {
          predictions: [],
          error:
            'Location search is turned off for this app. Enable the "Places API (New)" and billing in Google Cloud, then try again. You can still type a place above.',
        };
      }
      return {
        predictions: [],
        error:
          detail ||
          `Place search failed (${String(res.status)}). You can still type a place above.`,
      };
    }
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
    const predictions = (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({
        placeId: p.placeId,
        primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? 'Place',
        secondary: p.structuredFormat?.secondaryText?.text ?? '',
      }));
    return { predictions };
  } catch {
    return { predictions: [], error: 'Could not reach location search. Check your connection.' };
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
