import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import styles from './FileList.module.css'
import InputModal from './InputModal'
import { useCreateFolder } from '../../queries/fileList/createFolder'
import { useDeleteFile } from '../../queries/fileList/deleteFile'
import { useDeleteFolder } from '../../queries/fileList/deleteFolder'
import { useDownloadFile } from '../../queries/fileList/downloadFile'
import { useGetFile } from '../../queries/fileList/getFile'
import { useGetFolder } from '../../queries/fileList/getFolder'
import { usePatchFile } from '../../queries/fileList/patchFile'
import { usePatchFolder } from '../../queries/fileList/patchFolder'
import { useUploadFile } from '../../queries/fileList/uploadFile'

interface IFile {
    id: number
    name: string
    path_on_disk: string
    file_size: number
    parent_folder_id: number
    owner_id: number
    created_at: string
}

interface IFolder {
    id: number
    name: string
    parent_folder_id: number
    owner_id: number
    created_at: string
}

interface IFolderCreate {
    name: string
    parent_folder_id: number
}

function FileList() {
    const navigate = useNavigate()
    const email = localStorage.getItem('cms_email')
    const name = localStorage.getItem('cms_name')
    const [searchParams] = useSearchParams()
    const currentFolderId = searchParams.get('folder')
        ? parseInt(searchParams.get('folder')!)
        : 0
    const uploadMutation = useUploadFile()
    const createFolderMutation = useCreateFolder()
    const patchFolderMutation = usePatchFolder()
    const patchFileMutation = usePatchFile()
    const [folderName, setFolderName] = useState('')
    const [isInputModalOpen, setIsInputModalOpen] = useState(false)
    const [, setInputModalType] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const { data: fileData } = useGetFile()
    const deleteFileMutation = useDeleteFile()
    const { data: folderData } = useGetFolder()
    const deleteFolderMutation = useDeleteFolder()
    const downloadFileMutation = useDownloadFile()
    const contextMenuRef = useRef<HTMLDivElement>(null)
    const [isTrashOpen, setIsTrashOpen] = useState(false)

    const [contextMenu, setContextMenu] = useState({
        isOpen: false,
        x: 0,
        y: 0,
        type: '', // folder or file
        targetId: 0,
        targetName: '',
    })
    const [draggingItem, setDraggingItem] = useState<{
        type: 'file' | 'folder'
        id: number
        name: string
        x: number
        y: number
    } | null>(null)
    const [dragStart, setDragStart] = useState<{
        type: 'file' | 'folder'
        id: number
        name: string
        x: number
        y: number
    } | null>(null)

    // 컨텍스트 메뉴 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                contextMenuRef.current &&
                !contextMenuRef.current.contains(event.target as Node)
            ) {
                setContextMenu((prev) => ({ ...prev, isOpen: false }))
            }
        }

        if (contextMenu.isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [contextMenu.isOpen])

    // 우클릭 핸들러
    const handleContextMenu = (
        e: React.MouseEvent,
        type: 'file' | 'folder',
        id: number,
        name: string,
    ) => {
        e.preventDefault()
        if (contextMenu.isOpen) return
        if (id === null) return
        if (type === null) return

        setContextMenu({
            isOpen: true,
            x: e.clientX,
            y: e.clientY,
            type: type,
            targetId: id,
            targetName: name,
        })
    }

    // 마우스 이동 이벤트 (document 레벨)
    useEffect(() => {
        const DRAG_THRESHOLD = 5 // 마우스 드래그 시작 트리거 거리

        const handleMouseMove = (e: MouseEvent) => {
            // 드래그 준비 상태(마우스 좌클릭 후 5px 이상 움직여야 드래그 시작)
            if (!isDragging && dragStart) {
                const deltaX = Math.abs(e.clientX - dragStart.x)
                const deltaY = Math.abs(e.clientY - dragStart.y)

                if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
                    setIsDragging(true)
                    setDraggingItem({
                        ...dragStart,
                        x: e.clientX,
                        y: e.clientY,
                    })
                }
            }
            // 실제 드래그 중일 때 위치 업데이트
            if (isDragging && draggingItem) {
                setDraggingItem((prev) =>
                    prev
                        ? {
                              ...prev,
                              x: e.clientX,
                              y: e.clientY,
                          }
                        : null,
                )
            }
        }

        const handleMouseUp = (e: MouseEvent) => {
            // 드래그 준비 상태만 있고 실제 드래그하지 않았다면 클릭으로 처리
            if (dragStart && !isDragging) {
                setDragStart(null)
                if (!isDragging && dragStart) {
                    if (dragStart.type === 'folder') {
                        navigate(`/?folder=${dragStart.id}`)
                    }
                    if (dragStart.type === 'file') {
                        downloadFileMutation.mutate(dragStart.id)
                    }
                }
                return
            }
            // 실제 드래그 상태였다면 드롭 처리
            if (isDragging && draggingItem) {
                // 드래그 프리뷰를 일시적으로 숨기고 실제 요소 찾기
                const dragPreview = document.querySelector(
                    `.${styles.drag_preview}`,
                ) as HTMLElement
                if (dragPreview) {
                    dragPreview.style.display = 'none'
                }

                // 마우스를 뗀 위치의 요소 정보 가져오기
                const elementAtPoint = document.elementFromPoint(
                    e.clientX,
                    e.clientY,
                )

                // 드래그 프리뷰 다시 보이기
                if (dragPreview) {
                    dragPreview.style.display = 'block'
                }

                if (elementAtPoint) {
                    // 가장 가까운 폴더나 파일 요소 찾기
                    const folderElement =
                        elementAtPoint.closest('[data-folder-id]')
                    const fileElement = elementAtPoint.closest('[data-file-id]')

                    if (folderElement) {
                        const folderId =
                            folderElement.getAttribute('data-folder-id')
                        const folderName =
                            folderElement.getAttribute('data-folder-name')

                        console.log('드롭된 폴더 정보:', {
                            id: folderId,
                            name: folderName,
                        })
                        console.log('드래그한 아이템:', draggingItem)

                        // 자기 자신에게 드롭하는 경우 무시
                        if (
                            draggingItem.type === 'folder' &&
                            draggingItem.id === parseInt(folderId!)
                        ) {
                            console.log('자기 자신에게 드롭함 - 무시')
                        } else {
                            // 실제 이동 로직 구현
                            if (draggingItem.type === 'folder') {
                                patchFolderMutation.mutate({
                                    folderId: draggingItem.id,
                                    newFolderName: null,
                                    parentFolderId: parseInt(folderId!),
                                })
                            } else if (draggingItem.type === 'file') {
                                patchFileMutation.mutate({
                                    fileId: draggingItem.id,
                                    newFileName: null,
                                    parentFolderId: parseInt(folderId!),
                                })
                            }
                            console.log(
                                `${draggingItem.type} ${draggingItem.name}을(를) 폴더 ${folderName}(${folderId})로 이동`,
                            )
                        }
                    } else if (fileElement) {
                        const fileId = fileElement.getAttribute('data-file-id')
                        const fileName =
                            fileElement.getAttribute('data-file-name')
                        console.log('파일 위에 드롭됨:', {
                            id: fileId,
                            name: fileName,
                        })
                    } else {
                        console.log('드래그한 아이템:', draggingItem)
                        console.log('현재 폴더 ID:', currentFolderId)
                    }
                }
            }

            // 모든 상태 초기화
            setIsDragging(false)
            setDraggingItem(null)
            setDragStart(null)
        }

        if (dragStart || isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [dragStart, isDragging, draggingItem, currentFolderId])

    // 드래그 시작
    const handleMouseDown = (
        e: React.MouseEvent,
        type: 'file' | 'folder',
        id: number,
        name: string,
    ) => {
        // 우클릭이면 드래그 시작하지 않음
        if (e.button === 2) return

        e.preventDefault()
        setDragStart({
            type,
            id,
            name,
            x: e.clientX,
            y: e.clientY,
        })
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)
        formData.append('parent_folder_id', currentFolderId.toString())

        uploadMutation.mutate(formData)

        event.target.value = ''
    }

    const handleCreateFolder = () => {
        if (!folderName) return

        const folder: IFolderCreate = {
            name: folderName,
            parent_folder_id: currentFolderId,
        }

        createFolderMutation.mutate(folder)
    }

    const handleRename = () => {
        setIsInputModalOpen(true)
        setInputModalType('rename')
        setContextMenu((prev) => ({ ...prev, isOpen: false }))
    }

    const handleMove = () => {
        console.log(
            `Move ${contextMenu.type} with ID: ${contextMenu.targetId} and name: ${contextMenu.targetName}`,
        )
    }

    // 컨텍스트 메뉴 액션
    const handleDelete = () => {
        console.log(
            `Delete ${contextMenu.type} with ID: ${contextMenu.targetId} and name: ${contextMenu.targetName}`,
        )
        setContextMenu((prev) => ({ ...prev, isOpen: false }))
        if (contextMenu.type === 'file') {
            deleteFileMutation.mutate(contextMenu.targetId)
        }
        if (contextMenu.type === 'folder') {
            deleteFolderMutation.mutate(contextMenu.targetId)
        }
    }

    return (
        <div className={styles.file_list}>
            <div className={styles.file_list_header}>
                {name !== '' && (
                    <h2>
                        현재 {email} {name} 사용자의{' '}
                        {currentFolderId !== 0
                            ? `${currentFolderId}번 폴더`
                            : '루트 폴더'}
                    </h2>
                )}
                {name === '' && <h2>로그인 안되어있음</h2>}
                <label className={styles.file_list_upload_button}>
                    파일 선택
                    <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploadMutation.isPending}
                    />
                </label>
                <div className={styles.file_list_create_button_container}>
                    <input
                        className={styles.file_list_create_folder_input}
                        type="text"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                    />
                    <button onClick={handleCreateFolder}>폴더 생성</button>
                </div>
            </div>
            {currentFolderId !== 0 && (
                <div className={styles.file_list_container}>
                    <div
                        className={styles.folder_list_item}
                        onClick={() =>
                            navigate(
                                `/?folder=${
                                    folderData.parent_folder_id === null
                                        ? 0
                                        : folderData.parent_folder_id
                                }`,
                            )
                        }
                    >
                        🗂️ ..
                    </div>
                </div>
            )}
            {/* 폴더 목록 */}
            {folderData && folderData.folders && (
                <div className={styles.file_list_container}>
                    {folderData.folders.map((folder: IFolder) => (
                        <div
                            className={styles.folder_list_item}
                            key={folder.id}
                            data-folder-id={folder.id}
                            data-folder-name={folder.name}
                            onMouseDown={(e) =>
                                handleMouseDown(
                                    e,
                                    'folder',
                                    folder.id,
                                    folder.name,
                                )
                            }
                            onClick={() => {}}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                handleContextMenu(
                                    e,
                                    'folder',
                                    folder.id,
                                    folder.name,
                                )
                            }}
                            style={{
                                cursor: isDragging ? 'grabbing' : '',
                                userSelect: 'none',
                            }}
                        >
                            🗂️ {folder.name}
                        </div>
                    ))}
                </div>
            )}
            {fileData && (
                <div className={styles.file_list_container}>
                    {fileData.map((file: IFile) => (
                        <div
                            className={styles.file_list_item}
                            key={file.id}
                            data-file-id={file.id}
                            data-file-name={file.name}
                            onMouseDown={(e) =>
                                handleMouseDown(e, 'file', file.id, file.name)
                            }
                            onContextMenu={(e) => {
                                e.preventDefault()
                                handleContextMenu(e, 'file', file.id, file.name)
                            }}
                            style={{
                                cursor: isDragging ? 'grabbing' : 'grab',
                                userSelect: 'none',
                            }}
                        >
                            📄 {file.name}
                        </div>
                    ))}
                </div>
            )}

            {/* 컨텍스트 메뉴 */}
            <div
                ref={contextMenuRef}
                className={`${styles.context_menu} ${contextMenu.isOpen ? styles.context_menu_open : styles.context_menu_closed}`}
                style={{
                    position: 'fixed',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    zIndex: 1000,
                }}
            >
                <div onClick={handleRename}>{'이름 변경'}</div>
                <div onClick={handleMove}>{'이동'}</div>
                <div style={{ color: 'red' }} onClick={handleDelete}>
                    {'삭제'}
                </div>
            </div>
            <InputModal
                isOpen={isInputModalOpen}
                onClose={() => setIsInputModalOpen(false)}
                type={contextMenu.type as 'folder' | 'file'}
                targetId={contextMenu.targetId}
                targetName={contextMenu.targetName}
            />
            {/* 드래그 프리뷰 */}
            {draggingItem && isDragging && (
                <div
                    className={styles.drag_preview}
                    style={{
                        position: 'fixed',
                        left: draggingItem.x + 10,
                        top: draggingItem.y + 10,
                        pointerEvents: 'none',
                        zIndex: 9999,
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                >
                    {draggingItem.type === 'folder' ? '🗂️' : '📄'}{' '}
                    {draggingItem.name}
                </div>
            )}
            <div
                className={`${styles.trash_container} ${isTrashOpen ? styles.trash_container_open : styles.trash_container_closed}`}
            ></div>
            {isTrashOpen && <div>TrashOpen</div>}
            {!isTrashOpen && <div>TrashClosed</div>}
        </div>
    )
}

export default FileList
