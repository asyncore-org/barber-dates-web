import { useMutation } from '@tanstack/react-query'
import { repositories } from '@/infrastructure'
import type { UpdateProfileData } from '@/domain/user'

export function useUpdateProfile() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileData }) =>
      repositories.profiles().update(id, data),
  })
}
