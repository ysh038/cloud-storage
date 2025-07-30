import styles from './ProgressModal.module.css'
import { useProgressStore } from '../../stores/shared/useProgress'

// 특정 파일의 진행률 조회
export function FileUploadItem({
    file,
    fileId,
}: {
    file: File
    fileId: string
}) {
    const { getUploadProgress, removeUploadProgress } = useProgressStore()
    const uploadProgress = getUploadProgress(fileId)

    return (
        <div>
            <span>{file.name}</span>
            {uploadProgress && (
                <div>
                    <div>{uploadProgress.progress}%</div>
                    <div
                        style={{
                            width: `${uploadProgress.progress}%`,
                            backgroundColor: 'blue',
                            height: '4px',
                        }}
                    />
                    {uploadProgress.isUploaded && <span>✅ 완료</span>}
                </div>
            )}
        </div>
    )
}

// 모든 업로드 진행률 조회
export function UploadProgressList() {
    const { uploadProgress, removeUploadProgress } = useProgressStore()

    return (
        Object.keys(uploadProgress).length > 0 && (
            <div className={styles.progress_container}>
                {Object.entries(uploadProgress).map(([fileId, progress]) => (
                    <div className={styles.progress_item} key={fileId}>
                        <span>{progress.fileName}</span>
                        {progress.progress === 100 ? (
                            <span>✅ 완료</span>
                        ) : (
                            <span>{progress.progress}%</span>
                        )}
                        {progress.isUploaded ? (
                            <button
                                className={styles.close_button}
                                onClick={() => {
                                    removeUploadProgress(fileId)
                                }}
                            >
                                ❌
                            </button>
                        ) : null}
                    </div>
                ))}
            </div>
        )
    )
}
