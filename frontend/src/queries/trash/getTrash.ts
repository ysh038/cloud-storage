import { useQuery } from '@tanstack/react-query'

import apiClient from '../../utils/apiClient'

const getTrash = async () => {
    const response = await apiClient.get(`http://localhost:8000/files/trash`)
    return response.data
}

export const useGetTrash = () => {
    return useQuery({
        queryKey: ['trash'],
        queryFn: () => getTrash(),
    })
}
