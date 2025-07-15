import { useMutation, useQueryClient } from '@tanstack/react-query'

import apiClient from '../../utils/apiClient'

const deletePermanent = async (fileId: number) => {
    const response = await apiClient.delete(
        `http://localhost:8000/files/${fileId}/permanent`,
    )
    return response.data
}

export const useDeletePermanent = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (fileId: number) => deletePermanent(fileId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] })
        },
    })
}
