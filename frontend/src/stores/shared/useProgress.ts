import { create } from 'zustand'

export interface IUploadProgress {
    progress: number
    isUploaded: boolean
    fileName?: string
}

interface IProgressState {
    // 파일별 진행률을 관리하는 Map
    uploadProgress: Record<string, IUploadProgress>

    // 파일 업로드 진행률 설정
    setUploadProgress: (
        fileId: string,
        progress: number,
        fileName?: string,
    ) => void

    // 파일 업로드 완료 상태 설정
    setUploadCompleted: (fileId: string) => void

    // 특정 파일의 진행률 제거
    removeUploadProgress: (fileId: string) => void

    // 모든 진행률 초기화
    clearAllProgress: () => void

    // 특정 파일의 진행률 조회
    getUploadProgress: (fileId: string) => IUploadProgress | undefined
}

export const useProgressStore = create<IProgressState>((set, get) => ({
    uploadProgress: {},

    setUploadProgress: (fileId: string, progress: number, fileName?: string) =>
        set((state) => ({
            uploadProgress: {
                ...state.uploadProgress,
                [fileId]: {
                    progress,
                    isUploaded: progress === 100,
                    fileName,
                },
            },
        })),

    setUploadCompleted: (fileId: string) =>
        set((state) => ({
            uploadProgress: {
                ...state.uploadProgress,
                [fileId]: {
                    ...state.uploadProgress[fileId],
                    isUploaded: true,
                    progress: 100,
                },
            },
        })),

    removeUploadProgress: (fileId: string) =>
        set((state) => {
            const newProgress = { ...state.uploadProgress }
            delete newProgress[fileId]
            return { uploadProgress: newProgress }
        }),

    clearAllProgress: () => set({ uploadProgress: {} }),

    getUploadProgress: (fileId: string) => {
        const state = get()
        return state.uploadProgress[fileId]
    },
}))
