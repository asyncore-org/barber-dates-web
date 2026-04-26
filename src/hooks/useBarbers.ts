import { useQuery } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import { queryKeys, STALE } from './queryKeys'

export function useBarbers() {
  return useQuery({
    queryKey: queryKeys.barbers.list(),
    queryFn: () => repositories.barbers().getActive(),
    staleTime: STALE.LONG,
  })
}
