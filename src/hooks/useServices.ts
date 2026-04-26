import { useQuery } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import { queryKeys, STALE } from './queryKeys'

export function useServices() {
  return useQuery({
    queryKey: queryKeys.services.list(),
    queryFn: () => repositories.services().getActive(),
    staleTime: STALE.LONG,
  })
}
