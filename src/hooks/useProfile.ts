import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { UpdateProfileData, UserRole } from '@/domain/user'

export function useUpdateProfile() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileData }) =>
      repositories.profiles().update(id, data),
  })
}

export function useAdminProfiles() {
  return useQuery({
    queryKey: ['admin', 'profiles'],
    queryFn: () => repositories.profiles().getAll(),
  })
}

export function useUpdateProfileRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      repositories.profiles().updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'profiles'] }),
  })
}
