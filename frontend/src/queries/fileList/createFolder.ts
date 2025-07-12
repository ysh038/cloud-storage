import { useMutation, useQueryClient } from '@tanstack/react-query'

import apiClient from '../../utils/apiClient'

interface IFolderCreate {
    name: string
    parent_folder_id: number
}

const createFolder = async (folder: IFolderCreate) => {
    const response = await apiClient.post(
        'http://localhost:8000/folders/',
        folder,
    )
    return response.data
}

export const useCreateFolder = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createFolder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folder'] })
        },
        onError: (error) => {
            console.error('폴더 생성 실패:', error)
        },
    })
}
