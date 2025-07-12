import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

import apiClient from '../../utils/apiClient'

const getFolder = async (currentFolderId: number) => {
    const response = await apiClient.get(
        `http://localhost:8000/folders/?current_folder_id=${currentFolderId}`,
    )
    return response.data
}

export const useGetFolder = () => {
    const [searchParams] = useSearchParams()
    const parentFolderId = searchParams.get('folder')
        ? parseInt(searchParams.get('folder')!)
        : 0

    return useQuery({
        queryKey: ['folder', parentFolderId], // location 변경 시 쿼리 재실행
        queryFn: () => getFolder(parentFolderId),
    })
}
