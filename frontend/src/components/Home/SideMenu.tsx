import { useNavigate } from 'react-router-dom'

import styles from './SideMenu.module.css'

function SideMenu() {
    const navigate = useNavigate()
    return (
        <div className={styles.side_menu_container}>
            <div className={styles.side_menu_header}>
                <h2>SideMenu</h2>
            </div>
            <div className={styles.side_menu_content}>
                <div className={styles.side_menu_item_container}>
                    <div
                        className={styles.side_menu_item}
                        onClick={() => {
                            navigate('/')
                        }}
                    >
                        Home
                    </div>
                    <div
                        className={styles.side_menu_item}
                        onClick={() => {
                            navigate('/trash')
                        }}
                    >
                        Trash
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SideMenu
