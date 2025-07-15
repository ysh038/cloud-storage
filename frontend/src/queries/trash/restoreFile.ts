import { useMutation, useQueryClient } from '@tanstack/react-query'

import apiClient from '../../utils/apiClient'

const restoreFile = async (fileId: number) => {
    const response = await apiClient.post(
        `http://localhost:8000/files/${fileId}/restore`,
    )
    return response.data
}

export const useRestoreFile = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (fileId: number) => restoreFile(fileId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash'] })
        },
    })
}
