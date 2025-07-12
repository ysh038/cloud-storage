import { useMutation } from '@tanstack/react-query'

import apiClient from '../../utils/apiClient'

export const useDownloadFile = () => {
    return useMutation({
        mutationFn: (fileId: number) => downloadFile(fileId),
    })
}

export const downloadFile = async (fileId: number) => {
    const timestamp = Date.now().toString()
    const response = await apiClient.get(
        `http://localhost:8000/files/download/${fileId}?t=${timestamp}`,
        {
            responseType: 'blob',
        },
    )
    const url = window.URL.createObjectURL(new Blob([response.data]))

    const link = document.createElement('a')
    link.href = url

    // 파일명 추출 (Content-Disposition 헤더에서)
    const contentDisposition = response.headers['content-disposition']
    const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `download_${fileId}`

    link.download = filename
    link.click()

    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}
