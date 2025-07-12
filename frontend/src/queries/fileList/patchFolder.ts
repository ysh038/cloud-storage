import { useMutation, useQueryClient } from '@tanstack/react-query'

import apiClient from '../../utils/apiClient'

interface IPatchFolderParams {
    folderId: number
    newFolderName: string | null
    parentFolderId: number | null
}
const patchFolder = async (params: IPatchFolderParams) => {
    try {
        const response = await apiClient.patch(
            `http://localhost:8000/folders/${params.folderId}/`,
            {
                name: params.newFolderName,
                parent_folder_id: params.parentFolderId,
            },
        )
        return response.data
    } catch (error) {
        console.error(error)
        throw error
    }
}

export const usePatchFolder = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: patchFolder,
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
