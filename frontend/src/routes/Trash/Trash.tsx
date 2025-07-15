import styles from './Trash.module.css'
import SideMenu from '../../components/Home/SideMenu'
import { TrashList } from '../../components/Trash'

function Trash() {
    return (
        <div className={styles.trash_container}>
            <SideMenu />
            <TrashList />
        </div>
    )
}

export default Trash
