import { useMutation, useQueryClient } from '@tanstack/react-query'

import apiClient from '../../utils/apiClient'

const uploadFile = async (formData: FormData) => {
    const response = await apiClient.post(
        'http://localhost:8000/files/',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        },
    )
    return response.data
}

export const useUploadFile = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: uploadFile,
        onSuccess: () => {
            // 업로드 성공 시 파일 목록 새로고침
            queryClient.invalidateQueries({ queryKey: ['file'] })
        },
        onError: (error) => {
            console.error('업로드 실패:', error)
        },
    })
}
