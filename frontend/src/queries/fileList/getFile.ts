import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

import apiClient from '../../utils/apiClient'

const getFile = async (parentFolderId: string) => {
    const response = await apiClient.get(
        `http://localhost:8000/files/?parent_folder_id=${parentFolderId}`,
    )
    return response.data
}

export const useGetFile = () => {
    const [searchParams] = useSearchParams()

    const parentFolderId = searchParams.get('folder')
        ? searchParams.get('folder')!
        : '0'

    return useQuery({
        queryKey: ['file', parentFolderId],
        queryFn: () => getFile(parentFolderId),
    })
}
