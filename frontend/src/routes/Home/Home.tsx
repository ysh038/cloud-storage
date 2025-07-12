import { useNavigate } from 'react-router-dom'

import styles from './Home.module.css'
import FileList from '../../components/Home/FileList'

function Home() {
    const navigate = useNavigate()
    const name = localStorage.getItem('cms_name')

    return (
        <main className={styles.main}>
            <h1>CMS Test</h1>
            <div className={styles.auth_buttons}>
                <button
                    className={styles.signup_button}
                    onClick={() => navigate('/signup')}
                >
                    SignUp
                </button>
                {name ? (
                    <button
                        className={styles.login_button}
                        onClick={() => {
                            localStorage.removeItem('cms_name')
                            localStorage.removeItem('cms_email')
                            localStorage.removeItem('access_token')
                            localStorage.removeItem('refresh_token')
                            navigate('/')
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
            <div className={styles.content_container}>
                <FileList />
            </div>
        </main>
    )
}

export default Home
