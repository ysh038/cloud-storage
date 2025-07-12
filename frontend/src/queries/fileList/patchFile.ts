import { useMutation, useQueryClient } from '@tanstack/react-query'

import apiClient from '../../utils/apiClient'

interface IPatchFileParams {
    fileId: number
    newFileName: string | null
    parentFolderId: number | null
}
const patchFile = async (params: IPatchFileParams) => {
    try {
        const response = await apiClient.patch(
            `http://localhost:8000/files/${params.fileId}/`,
            {
                name: params.newFileName,
                parent_folder_id: params.parentFolderId,
            },
        )
        return response.data
    } catch (error) {
        console.error(error)
        throw error
    }
}

export const usePatchFile = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: patchFile,
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
