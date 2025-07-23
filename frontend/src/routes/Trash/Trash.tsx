import styles from './Trash.module.css'
import SideMenu from '../../components/Home/SideMenu'
import { TrashList } from '../../components/Trash'

function Trash() {
    return (
        <div className={styles.trash_container}>
            <h1 className={styles.trash_title}>Trash</h1>
            <div className={styles.trash_content}>
                <SideMenu />
                <TrashList />
            </div>
        </div>
    )
}

export default Trash
