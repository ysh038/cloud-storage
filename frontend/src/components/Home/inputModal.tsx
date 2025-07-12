import { useState } from 'react'

import styles from './inputModal.module.css'
import { usePatchFile } from '../../queries/fileList/patchFile'
import { usePatchFolder } from '../../queries/fileList/patchFolder'

interface IInputModalProps {
    isOpen: boolean
    onClose: () => void
    type: 'folder' | 'file'
    targetId: number
    targetName: string
}

function InputModal({
    isOpen,
    onClose,
    type,
    targetId,
    targetName,
}: IInputModalProps) {
    const [inputValue, setInputValue] = useState('')
    const patchFolderMutation = usePatchFolder()
    const patchFileMutation = usePatchFile()
    const handleClose = () => {
        setInputValue('')
        onClose()
    }

    const handleSubmit = async () => {
        if (type === 'folder') {
            const result = await patchFolderMutation.mutateAsync({
                folderId: targetId,
                newFolderName: inputValue,
            })
            if (result) {
                handleClose()
            }
        } else if (type === 'file') {
            const result = await patchFileMutation.mutateAsync({
                fileId: targetId,
                newFileName: inputValue,
            })
            if (result) {
                handleClose()
            }
        }
    }

    return (
        <div
            className={`${styles.input_modal_wrapper} ${isOpen ? styles.input_modal_open : styles.input_modal_closed}`}
        >
            <div className={styles.input_modal_container}>
                <div className={styles.input_modal_header}>
                    <h2>
                        {type === 'folder'
                            ? '폴더 이름 변경'
                            : '파일 이름 변경'}
                    </h2>
                </div>
                <div className={styles.input_modal_body}>
                    <input
                        type="text"
                        placeholder={targetName}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                </div>
                <div className={styles.input_modal_footer}>
                    <button onClick={handleClose}>취소</button>
                    <button onClick={handleSubmit}>변경</button>
                </div>
            </div>
        </div>
    )
}

export default InputModal
