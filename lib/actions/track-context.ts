'use server'

import { cookies } from 'next/headers'
import { TRACK_COOKIE_KEY } from '@/lib/selected-track'

export async function setSelectedTrack(trackId: string | null): Promise<void> {
  const store = await cookies()
  if (trackId) {
    store.set(TRACK_COOKIE_KEY, trackId, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  } else {
    store.delete(TRACK_COOKIE_KEY)
  }
}
