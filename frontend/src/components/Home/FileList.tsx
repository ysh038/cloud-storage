import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import styles from './FileList.module.css'
import InputModal from './InputModal'
import { UploadProgressList } from './progressModal'
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
    _id: string
    name: string
    path_on_disk: string
    file_size: number
    parent_folder_id: string
    owner_id: string
    created_at: string
}

interface IFolder {
    _id: string
    name: string
    parent_folder_id: string
    owner_id: string
    created_at: string
}

function FileList() {
    const navigate = useNavigate()
    const name = localStorage.getItem('cms_name')
    const [searchParams] = useSearchParams()
    const currentFolderId = searchParams.get('folder')
        ? searchParams.get('folder')!
        : '0'
    const uploadMutation = useUploadFile()
    const createFolderMutation = useCreateFolder()
    const patchFolderMutation = usePatchFolder()
    const patchFileMutation = usePatchFile()
    const [isInputModalOpen, setIsInputModalOpen] = useState(false)
    const [inputModalType, setInputModalType] = useState<
        '' | 'rename' | 'create'
    >('')
    const [isDragging, setIsDragging] = useState(false)
    const { data: fileData } = useGetFile()
    const deleteFileMutation = useDeleteFile()
    const { data: folderData } = useGetFolder()
    const deleteFolderMutation = useDeleteFolder()
    const downloadFileMutation = useDownloadFile()
    const [currentUploadedFiles, setCurrentUploadedFiles] = useState<string>('')
    const [fileCount, setFileCount] = useState(0)
    const [currentFileIndex, setCurrentFileIndex] = useState(0)
    const contextMenuRef = useRef<HTMLDivElement>(null)

    // 재시도 관련 상태 추가
    const [failedUpload, setFailedUpload] = useState<{
        isVisible: boolean
        fileName: string
        error: string
        failedIndex: number
        retryData: {
            files: File[]
            folderMap: Map<string, string>
        }
    } | null>(null)

    const [contextMenu, setContextMenu] = useState({
        isOpen: false,
        x: 0,
        y: 0,
        type: '', // folder or file or null
        targetId: '',
        targetName: '',
    })
    const [draggingItem, setDraggingItem] = useState<{
        type: 'file' | 'folder'
        id: string
        name: string
        x: number
        y: number
    } | null>(null)
    const [dragStart, setDragStart] = useState<{
        type: 'file' | 'folder'
        id: string
        name: string
        x: number
        y: number
    } | null>(null)
    const [activeItem, setActiveItem] = useState<
        {
            type: 'file' | 'folder'
            id: string
            name: string
        }[]
    >([])

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
        type: 'file' | 'folder' | null,
        id: string,
        name: string,
    ) => {
        e.preventDefault()
        e.stopPropagation()

        if (contextMenu.isOpen) return
        if (id === null) return
        console.log('type:', type)
        setContextMenu({
            isOpen: true,
            x: e.clientX,
            y: e.clientY,
            type: type || '',
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
                        // navigate(`/?folder=${dragStart.id}`)
                    }
                    if (dragStart.type === 'file') {
                        // downloadFileMutation.mutate(dragStart.id)
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
                            draggingItem.id === folderId!
                        ) {
                            console.log('자기 자신에게 드롭함 - 무시')
                        } else {
                            // 실제 이동 로직 구현
                            if (draggingItem.type === 'folder') {
                                patchFolderMutation.mutate({
                                    folderId: draggingItem.id,
                                    newFolderName: null,
                                    parentFolderId: folderId!,
                                })
                            } else if (draggingItem.type === 'file') {
                                patchFileMutation.mutate({
                                    fileId: draggingItem.id,
                                    newFileName: null,
                                    parentFolderId: folderId!,
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
                        e.preventDefault()
                        const draggedFolderId = folderData.parent_folder_id

                        // 부모 폴더로 이동
                        const parentId =
                            folderData.parent_folder_id === null
                                ? '0'
                                : folderData.parent_folder_id

                        if (draggingItem.type === 'folder') {
                            patchFolderMutation.mutate({
                                folderId: draggingItem.id,
                                parentFolderId: parentId,
                                newFolderName: null, // 이름은 변경하지 않음
                            })
                        } else {
                            patchFileMutation.mutate({
                                fileId: draggingItem.id,
                                parentFolderId: parentId,
                                newFileName: null,
                            })
                        }

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
        id: string,
        name: string,
    ) => {
        // 우클릭이면 드래그 시작하지 않음
        if (e.button === 2) return

        e.preventDefault()
        if (e.ctrlKey) {
            setActiveItem((prev) => [...prev, { type, id, name }])
        } else {
            setActiveItem([{ type, id, name }])
        }

        setDragStart({
            type,
            id,
            name,
            x: e.clientX,
            y: e.clientY,
        })
    }

    // 재시도 핸들러
    const handleRetry = async () => {
        if (!failedUpload?.retryData) return

        try {
            setFailedUpload((prev) =>
                prev ? { ...prev, isVisible: false } : null,
            )

            if (failedUpload.retryData.files.length === 1) {
                await handleFileUpload(failedUpload.retryData.files[0])
            } else {
                setFileCount(failedUpload.retryData.files.length)
                // 실패한 지점부터 다시 시작
                await uploadFilesToFolders(
                    failedUpload.retryData.files,
                    failedUpload.retryData.folderMap,
                    failedUpload.failedIndex, // 실패한 인덱스부터 시작
                )
            }
        } catch (error) {
            console.error('재시도 실패:', error)
            // 재시도 실패 시 에러 메시지만 업데이트
            setFailedUpload({
                ...failedUpload,
                isVisible: true,
            })
        }
    }

    // 재시도 UI 닫기
    const handleCloseRetry = () => {
        setFailedUpload(null)
        setCurrentUploadedFiles('')
    }

    // 디렉토리 업로드 처리 함수
    const handleDirectoryUpload = async (files: FileList) => {
        if (!files || files.length === 0) return

        try {
            const fileArray = Array.from(files)

            // 1. 폴더 구조 분석
            const folderStructure = analyzeFolderStructure(fileArray)
            // 2. 폴더들을 순차적으로 생성
            const folderMap = await createFoldersSequentially(folderStructure)
            // 3. 파일들을 각각의 폴더에 업로드
            await uploadFilesToFolders(fileArray, folderMap)
        } catch (error) {
            console.error('디렉토리 업로드 실패:', error)
        }
    }

    // 1. 폴더 구조 분석
    const analyzeFolderStructure = (files: File[]) => {
        const folderSet = new Set<string>()

        files.forEach((file) => {
            const relativePath = file.webkitRelativePath
            if (!relativePath) return

            // 파일 경로에서 폴더 경로들 추출
            const pathParts = relativePath.split('/')
            pathParts.pop() // 파일명 제거
            console.log('pathParts:', pathParts)
            // 각 깊이의 폴더 경로 추가
            let currentPath = ''
            pathParts.forEach((folderName) => {
                currentPath = currentPath
                    ? `${currentPath}/${folderName}`
                    : folderName
                folderSet.add(currentPath)
            })
            console.log('folderSet:', folderSet)
        })

        // 깊이순으로 정렬 (부모 폴더가 먼저 오도록)
        const sortedFolders = Array.from(folderSet).sort((a, b) => {
            return a.split('/').length - b.split('/').length
        })

        console.log('생성할 폴더 구조:', sortedFolders)
        return sortedFolders
    }

    // 2. 폴더들을 순차적으로 생성
    const createFoldersSequentially = async (folderPaths: string[]) => {
        const folderMap = new Map<string, string>() // path -> folderId

        for (const folderPath of folderPaths) {
            const pathParts = folderPath.split('/')
            const folderName = pathParts[pathParts.length - 1]

            // 부모 폴더 ID 찾기
            let parentFolderId = currentFolderId || '0' // 현재 위치 또는 루트
            if (pathParts.length > 1) {
                const parentPath = pathParts.slice(0, -1).join('/')
                parentFolderId = folderMap.get(parentPath) || '0'
            }

            try {
                // 폴더 생성
                const result = await createFolderMutation.mutateAsync({
                    name: folderName,
                    parent_folder_id:
                        parentFolderId === '0' ? null : parentFolderId,
                })

                const createdFolderId = result.folder._id
                folderMap.set(folderPath, createdFolderId)

                console.log(
                    `폴더 생성: ${folderName} (${folderPath}) -> ${createdFolderId}`,
                )
            } catch (error) {
                console.error(`폴더 생성 실패: ${folderPath}`, error)
                throw error
            }
        }

        return folderMap
    }

    // 3. 다수의 파일들을 각각의 폴더에 업로드
    const uploadFilesToFolders = async (
        files: File[],
        folder_map: Map<string, string>,
        start_index: number = 0,
    ) => {
        const fileMetadata: {
            index: number
            parent_folder_id: string
            filename: string
        }[] = []
        const fileArray: File[] = []

        files.forEach((file, index) => {
            const relativePath = file.webkitRelativePath
            if (!relativePath) return

            const pathParts = relativePath.split('/')
            let parentFolderId = currentFolderId || '0'
            if (pathParts.length > 1) {
                const folderPath = pathParts.slice(0, -1).join('/')
                parentFolderId = folder_map.get(folderPath) || '0'
            }

            fileArray.push(file)
            // 메타데이터 추가
            fileMetadata.push({
                index,
                parent_folder_id: parentFolderId === '0' ? '' : parentFolderId,
                filename: file.name,
            })
        })

        try {
            setFileCount(fileMetadata.length)
            for (let i = start_index; i < fileMetadata.length; i++) {
                const metadata = fileMetadata[i]
                const formData = new FormData()
                formData.append('file', fileArray[metadata.index])
                formData.append('metadata', JSON.stringify(metadata))
                try {
                    await uploadMutation.mutateAsync({
                        formData,
                        file: fileArray[metadata.index],
                    })
                    setCurrentUploadedFiles(fileArray[metadata.index].name)
                    setCurrentFileIndex(i)
                } catch (error) {
                    setFailedUpload({
                        isVisible: true,
                        fileName: fileArray[metadata.index].name,
                        error:
                            error instanceof Error
                                ? error.message
                                : '알 수 없는 오류',
                        failedIndex: i, // 현재 루프 인덱스 사용
                        retryData: { files, folderMap: folder_map },
                    })
                    throw error
                }
            }
        } catch (error) {
            console.error('파일 업로드 실패:', error)
            throw error
        }
    }

    // 개별 파일 업로드
    const handleFileUpload = async (fileInput: File) => {
        const file = fileInput

        if (!file) return

        const metadata = {
            index: 0,
            parent_folder_id: currentFolderId === '0' ? '' : currentFolderId,
            filename: file.name,
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('metadata', JSON.stringify(metadata))

        try {
            setFileCount(1)
            await uploadMutation.mutateAsync({ formData, file })
        } catch (error) {
            console.error('파일 업로드 실패:', error)

            setFailedUpload({
                isVisible: true,
                fileName: file.name,
                error:
                    error instanceof Error ? error.message : '알 수 없는 오류',
                failedIndex: 0, // 개별 파일이므로 0
                retryData: { files: [file], folderMap: new Map() }, // 개별 파일 재시도용
            })
        }
    }

    const handleCreateFolder = async () => {
        setIsInputModalOpen(true)
        setInputModalType('create')
        setContextMenu((prev) => ({ ...prev, isOpen: false }))
    }

    const handleRename = () => {
        setIsInputModalOpen(true)
        setInputModalType('rename')
        setContextMenu((prev) => ({ ...prev, isOpen: false }))
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

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        const items = Array.from(e.dataTransfer.items)

        const allFiles: File[] = []

        for (const item of items) {
            const entry = item.webkitGetAsEntry()

            if (entry?.isFile) {
                // 개별 파일
                const fileEntry = entry as FileSystemFileEntry
                const file = await getFileFromEntry(fileEntry)
                allFiles.push(file)
            } else if (entry?.isDirectory) {
                // 폴더 - 재귀적으로 모든 파일 추출
                const dirEntry = entry as FileSystemDirectoryEntry
                const filesInDir = await getAllFilesFromDirectory(dirEntry)
                allFiles.push(...filesInDir)
            }
        }
        // 🎯 이제 폴더 안 파일들도 모두 포함됨
        if (allFiles.length === 1 && !allFiles[0].webkitRelativePath) {
            // 개별 파일
            handleFileUpload(allFiles[0])
        } else {
            // 폴더 또는 여러 파일
            handleDirectoryUpload(allFiles as unknown as FileList)
        }
    }

    // FileSystemFileEntry 객체를 실제 File 객체로 변환 (Async Await 사용 불가능)
    const getFileFromEntry = (entry: FileSystemFileEntry): Promise<File> => {
        return new Promise((resolve) => {
            entry.file(resolve)
        })
    }

    const getAllFilesFromDirectory = async (
        dirEntry: FileSystemDirectoryEntry,
        basePath = '',
    ): Promise<File[]> => {
        const allFiles: File[] = []

        const readAllEntries = (
            reader: FileSystemDirectoryReader,
        ): Promise<FileSystemEntry[]> => {
            return new Promise((resolve) => {
                const entries: FileSystemEntry[] = []

                const readBatch = () => {
                    reader.readEntries((batch) => {
                        if (batch.length === 0) {
                            // 더 이상 읽을 항목이 없음
                            resolve(entries)
                        } else {
                            entries.push(...batch)
                            readBatch() // 🎯 재귀적으로 계속 읽기
                        }
                    })
                }

                readBatch()
            })
        }

        const reader = dirEntry.createReader()
        const entries = await readAllEntries(reader)

        for (const entry of entries) {
            if (entry.isFile) {
                const fileEntry = entry as FileSystemFileEntry
                const file = await getFileFromEntry(fileEntry)

                // 👉 webkitRelativePath 설정 추가
                const relativePath = basePath
                    ? `${basePath}/${entry.name}`
                    : `${dirEntry.name}/${entry.name}`

                Object.defineProperty(file, 'webkitRelativePath', {
                    value: relativePath,
                    writable: false,
                })

                allFiles.push(file)
            } else if (entry.isDirectory) {
                const subDirPath = basePath
                    ? `${basePath}/${entry.name}`
                    : `${dirEntry.name}/${entry.name}`
                const subDirFiles = await getAllFilesFromDirectory(
                    entry as FileSystemDirectoryEntry,
                    subDirPath, // 경로 전달
                )
                allFiles.push(...subDirFiles)
            }
        }
        console.log('allFiles:', allFiles)
        return allFiles
    }

    return (
        <div
            className={styles.file_list}
            onClick={(e) => {
                if (e.target === e.currentTarget) setActiveItem([])
            }}
            onContextMenu={(e) => {
                e.preventDefault()
                if (e.ctrlKey) {
                    return
                }
                handleContextMenu(e, null, '', '')
            }}
            onDragOver={(e) => {
                e.preventDefault()
            }}
            onDrop={handleDrop}
        >
            <div className={styles.file_list_header}>
                {name !== '' && (
                    <h3>
                        {currentFolderId !== '0' ? (
                            <span>📁 {currentFolderId} 폴더</span>
                        ) : (
                            <span>📁 루트 폴더</span>
                        )}
                    </h3>
                )}
                {name === '' && <h2>로그인 안되어있음</h2>}
            </div>
            {/* 상위 폴더 이동 */}
            {currentFolderId !== '0' && (
                <div className={styles.file_list_container}>
                    <div
                        className={styles.folder_list_item}
                        onDoubleClick={() =>
                            navigate(
                                `/?folder=${
                                    folderData.parent_folder_id === null
                                        ? '0'
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
                            className={`${styles.folder_list_item} ${
                                activeItem.some(
                                    (item) => item.id === folder._id,
                                )
                                    ? styles.active
                                    : ''
                            }`}
                            key={folder._id}
                            data-folder-id={folder._id}
                            data-folder-name={folder.name}
                            onDoubleClick={() => {
                                setActiveItem([])
                                navigate(`/?folder=${folder._id}`)
                            }}
                            onMouseDown={(e) =>
                                handleMouseDown(
                                    e,
                                    'folder',
                                    folder._id,
                                    folder.name,
                                )
                            }
                            onClick={() => {}}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                if (e.ctrlKey) {
                                    return
                                }
                                handleContextMenu(
                                    e,
                                    'folder',
                                    folder._id,
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
            {/* 파일 목록 */}
            {fileData && fileData.files && (
                <div className={styles.file_list_container}>
                    {fileData.files.map((file: IFile) => (
                        <div
                            className={`${styles.file_list_item} ${
                                activeItem.some((item) => item.id === file._id)
                                    ? styles.active
                                    : ''
                            }`}
                            key={file._id}
                            data-file-id={file._id}
                            data-file-name={file.name}
                            onMouseDown={(e) =>
                                handleMouseDown(e, 'file', file._id, file.name)
                            }
                            onContextMenu={(e) => {
                                e.preventDefault()
                                if (e.ctrlKey) {
                                    return
                                }
                                handleContextMenu(
                                    e,
                                    'file',
                                    file._id,
                                    file.name,
                                )
                            }}
                            style={{
                                cursor: isDragging ? 'grabbing' : '',
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
                {contextMenu.type !== '' && (
                    <div
                        onClick={() => {
                            handleRename()
                            setContextMenu((prev) => ({
                                ...prev,
                                isOpen: false,
                            }))
                        }}
                    >
                        {'이름 변경'}
                    </div>
                )}
                {contextMenu.type === 'file' && (
                    <div
                        onClick={() => {
                            downloadFileMutation.mutate(contextMenu.targetId)
                            setContextMenu((prev) => ({
                                ...prev,
                                isOpen: false,
                            }))
                        }}
                    >
                        {'다운로드'}
                    </div>
                )}
                {contextMenu.type !== '' && (
                    <div
                        style={{ color: 'red' }}
                        onClick={() => {
                            handleDelete()
                            setContextMenu((prev) => ({
                                ...prev,
                                isOpen: false,
                            }))
                        }}
                    >
                        {'삭제'}
                    </div>
                )}
                {contextMenu.type === '' && (
                    <div
                        onClick={() => {
                            handleCreateFolder()
                        }}
                    >
                        폴더 생성
                    </div>
                )}
            </div>
            {/* 입력 모달 */}
            <InputModal
                isOpen={isInputModalOpen}
                onClose={() => setIsInputModalOpen(false)}
                type={contextMenu.type as 'folder' | 'file' | ''}
                targetId={contextMenu.targetId}
                targetName={contextMenu.targetName}
                parentFolderId={currentFolderId}
                inputModalType={inputModalType}
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
            {/* 재시도 알림 */}
            {failedUpload?.isVisible && (
                <div className={styles.retry_notification}>
                    <div className={styles.retry_content}>
                        <div className={styles.retry_info}>
                            <span className={styles.error_icon}>⚠️</span>
                            <div>
                                <p className={styles.error_title}>
                                    {failedUpload.failedIndex}번째 파일 업로드
                                    실패
                                </p>
                                <p className={styles.error_filename}>
                                    {failedUpload.fileName}
                                </p>
                                <p className={styles.error_message}>
                                    {failedUpload.error}
                                </p>
                            </div>
                        </div>

                        <div className={styles.retry_buttons}>
                            <button
                                className={styles.retry_button}
                                onClick={handleRetry}
                            >
                                다시 시도
                            </button>
                            <button
                                className={styles.close_button}
                                onClick={handleCloseRetry}
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* 진행률 표시 */}
            <UploadProgressList />
        </div>
    )
}

export default FileList
