import { useMutation, useQueryClient } from '@tanstack/react-query'

import apiClient from '../../utils/apiClient'

const deleteFile = async (fileId: number) => {
    const response = await apiClient.delete(
        `http://localhost:8000/files/${fileId}/`,
    )
    return response.data
}

export const useDeleteFile = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteFile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['file'] })
            return true
        },
        onError: (error) => {
            console.error(error)
            return false
        },
    })
}
