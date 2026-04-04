import { cookies } from 'next/headers'

export const TRACK_COOKIE_KEY = 'selected_track'

export async function getSelectedTrackId(): Promise<string | null> {
  const store = await cookies()
  return store.get(TRACK_COOKIE_KEY)?.value ?? null
}
