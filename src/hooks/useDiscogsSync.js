import { useContext } from 'react'
import { DiscogsSyncContext } from './discogsSyncContext'

export function useDiscogsSync() {
  return useContext(DiscogsSyncContext)
}
