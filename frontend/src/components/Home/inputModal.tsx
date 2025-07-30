import { useState } from 'react'

import styles from './inputModal.module.css'
import { useCreateFolder } from '../../queries/fileList/createFolder'
import { usePatchFile } from '../../queries/fileList/patchFile'
import { usePatchFolder } from '../../queries/fileList/patchFolder'

interface IInputModalProps {
    isOpen: boolean
    onClose: () => void
    type: 'folder' | 'file' | ''
    targetId: string
    targetName: string
    parentFolderId: string
    inputModalType: '' | 'rename' | 'create'
}

function InputModal({
    isOpen,
    onClose,
    type,
    targetId,
    targetName,
    parentFolderId,
    inputModalType,
}: IInputModalProps) {
    const [inputValue, setInputValue] = useState('')
    const patchFolderMutation = usePatchFolder()
    const patchFileMutation = usePatchFile()
    const createFolderMutation = useCreateFolder()
    const handleClose = () => {
        setInputValue('')
        onClose()
    }

    const handleSubmit = async () => {
        // 금지된 문자 체크
        const invalidChars = /[<>:"/\\|?*]/
        if (invalidChars.test(inputValue.trim())) {
            alert('파일명에 사용할 수 없는 문자가 포함되어 있습니다.')
            return
        }
        if (inputModalType === 'create') {
            const result = await createFolderMutation.mutateAsync({
                name: inputValue,
                parent_folder_id: parentFolderId,
            })
            if (result) {
                handleClose()
            }
        } else if (inputModalType === 'rename') {
            if (type === 'folder') {
                if (inputValue === '') {
                    return
                }
                const result = await patchFolderMutation.mutateAsync({
                    folderId: targetId,
                    newFolderName: inputValue,
                    parentFolderId: parentFolderId,
                })
                if (result) {
                    handleClose()
                }
            } else if (type === 'file') {
                if (inputValue === '') {
                    return
                }
                let newFileName: string

                if (type === 'file') {
                    // 원본 파일에서 확장자 추출
                    const lastDotIndex = targetName.lastIndexOf('.')
                    const extension =
                        lastDotIndex !== -1
                            ? targetName.substring(lastDotIndex)
                            : ''

                    // 새 이름 생성 (공백 → 언더스코어, 확장자 추가)
                    newFileName =
                        inputValue.trim().replace(/ /g, '_') + extension

                    console.log(
                        `파일명 변경: "${targetName}" → "${newFileName}"`,
                    )
                } else {
                    // 폴더는 확장자 개념 없음
                    newFileName = inputValue.replace(/ /g, '_')
                }

                const result = await patchFileMutation.mutateAsync({
                    fileId: targetId,
                    newFileName: newFileName,
                    parentFolderId: parentFolderId,
                })
                if (result) {
                    handleClose()
                }
            }
        }
    }

    return (
        <div
            className={`${styles.input_modal_wrapper} ${isOpen ? styles.input_modal_open : styles.input_modal_closed}`}
        >
            <div className={styles.input_modal_container}>
                <div className={styles.input_modal_header}>
                    <h4>
                        {inputModalType === 'create'
                            ? '폴더 생성'
                            : inputModalType === 'rename'
                              ? type === 'folder'
                                  ? '폴더 이름 변경'
                                  : '파일 이름 변경'
                              : ''}
                    </h4>
                </div>
                <div className={styles.input_modal_body}>
                    <input
                        type="text"
                        placeholder={
                            inputModalType === 'create'
                                ? '폴더 이름을 입력해주세요.'
                                : inputModalType === 'rename'
                                  ? type === 'folder'
                                      ? targetName
                                      : targetName.split('.')[0]
                                  : '파일 이름을 입력해주세요.'
                        }
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                </div>
                <div className={styles.input_modal_footer}>
                    <button onClick={handleClose}>취소</button>
                    {inputModalType === 'rename' ? (
                        <button onClick={handleSubmit}>변경</button>
                    ) : (
                        <button onClick={handleSubmit}>생성</button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default InputModal
