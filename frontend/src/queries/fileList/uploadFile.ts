import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useProgressStore } from '../../stores/shared/useProgress'
import apiClient from '../../utils/apiClient'

// 고유 ID 생성 함수
const generateFileId = (file: File): string => {
    return `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
const uploadFile = async (
    formData: FormData,
    fileId: string,
    fileName: string,
) => {
    const { setUploadProgress, setUploadCompleted } =
        useProgressStore.getState()

    const response = await apiClient.post(
        'http://localhost:8000/files/',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.progress) {
                    const progressPercent = Math.round(
                        progressEvent.progress * 100,
                    )

                    // 파일별로 진행률 업데이트
                    setUploadProgress(fileId, progressPercent, fileName)

                    // 업로드 완료 시
                    if (progressEvent.loaded === progressEvent.total) {
                        setUploadCompleted(fileId)
                    }
                }
            },
            onDownloadProgress: (progressEvent) => {
                console.log('Download progress:', progressEvent.progress)
            },
        },
    )
    return response.data
}

export const useUploadFile = () => {
    const queryClient = useQueryClient()
    const { removeUploadProgress } = useProgressStore()

    return useMutation({
        mutationFn: ({
            formData,
            file,
        }: {
            formData: FormData
            file: File
        }) => {
            const fileId = generateFileId(file)
            return uploadFile(formData, fileId, file.name)
        },
        onSuccess: (data, variables) => {
            // 업로드 성공 시 파일 목록 새로고침
            queryClient.invalidateQueries({ queryKey: ['file'] })

            // 성공 후 일정 시간 뒤 진행률 제거 (선택사항)
            setTimeout(() => {
                const fileId = generateFileId(variables.file)
                removeUploadProgress(fileId)
            }, 3000) // 3초 후 제거
        },
        onError: (error, variables) => {
            console.error('업로드 실패:', error)
            // 실패 시에도 진행률 제거
            const fileId = generateFileId(variables.file)
            removeUploadProgress(fileId)
        },
    })
}

// 개별 파일 업로드를 위한 hook (기존 인터페이스 유지)
export const useUploadSingleFile = () => {
    const uploadMutation = useUploadFile()

    return {
        ...uploadMutation,
        uploadFile: (file: File, formData: FormData) => {
            return uploadMutation.mutate({ formData, file })
        },
    }
}
