import { useNavigate } from 'react-router-dom'

import styles from './SideMenu.module.css'

function SideMenu() {
    const navigate = useNavigate()
    const name = localStorage.getItem('cms_name')
    return (
        <div className={styles.side_menu_container}>
            <div className={styles.header_left}>
                <h3>CMS Test</h3>
                <div className={styles.auth_buttons}>
                    {/* <img src="" alt="user_img" /> */}
                    <span>👤</span>
                    <span className={styles.header_name}>{name}</span>
                    {name ? (
                        <button
                            className={styles.login_button}
                            onClick={() => {
                                localStorage.removeItem('cms_name')
                                localStorage.removeItem('cms_email')
                                localStorage.removeItem('access_token')
                                localStorage.removeItem('refresh_token')
                                navigate('/login')
                            }}
                        >
                            Logout
                        </button>
                    ) : (
                        <button
                            className={styles.login_button}
                            onClick={() => navigate('/login')}
                        >
                            Login
                        </button>
                    )}
                </div>
            </div>
            <div className={styles.side_menu_content}>
                <div className={styles.side_menu_item_container}>
                    <div
                        className={styles.side_menu_item}
                        onClick={() => {
                            navigate('/')
                        }}
                    >
                        🏠 홈
                    </div>
                    <div
                        className={styles.side_menu_item}
                        onClick={() => {
                            navigate('/trash')
                        }}
                    >
                        🗑️ 휴지통
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SideMenu
