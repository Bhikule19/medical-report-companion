export interface MapsConfig {
  apiKey: string;
  libraries: ('places' | 'marker')[];
}

export function getMapsConfig(): MapsConfig {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured');
  return { apiKey, libraries: ['places', 'marker'] };
}
