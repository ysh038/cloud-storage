import { useMutation, useQueryClient } from '@tanstack/react-query'

import apiClient from '../../utils/apiClient'

const deleteFolder = async (folderId: number) => {
    const response = await apiClient.delete(
        `http://localhost:8000/folders/${folderId}/`,
    )
    return response.data
}

export const useDeleteFolder = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteFolder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folder'] })
            return true
        },
        onError: (error) => {
            console.error(error)
            return false
        },
    })
}
