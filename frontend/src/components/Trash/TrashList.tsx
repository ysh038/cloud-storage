import styles from './TrashList.module.css'
import { useDeletePermanent } from '../../queries/trash/deletePermanent'
import { useGetTrash } from '../../queries/trash/getTrash'
import { useRestoreFile } from '../../queries/trash/restorefile'

interface ITrashItem {
    id: number
    name: string
    file_size: number
    deleted_at: string
}

function TrashList() {
    const { data } = useGetTrash()
    const deletePermanentMutation = useDeletePermanent()
    const restoreFileMutation = useRestoreFile()

    return (
        <div className={styles.trash_list_container}>
            <div className={styles.trash_list_header}>
                <div className={styles.trash_list_header_item}>Name</div>
                <div className={styles.trash_list_header_item}>Size</div>
                <div className={styles.trash_list_header_item}>Deleted At</div>
            </div>
            <div className={styles.trash_list_content}>
                {data?.map((item: ITrashItem) => (
                    <div className={styles.trash_list_item} key={item.id}>
                        <div className={styles.trash_list_item_name}>
                            {item.name}
                        </div>
                        <div className={styles.trash_list_item_size}>
                            {item.file_size} bytes
                        </div>
                        <div className={styles.trash_list_item_date}>
                            {item.deleted_at}
                        </div>
                        <div className={styles.trash_list_item_button}>
                            <button
                                onClick={() => {
                                    restoreFileMutation.mutate(item.id)
                                }}
                            >
                                🔄 Restore
                            </button>
                            <button
                                onClick={() => {
                                    deletePermanentMutation.mutate(item.id)
                                }}
                            >
                                ❌ Delete Permanent
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TrashList
