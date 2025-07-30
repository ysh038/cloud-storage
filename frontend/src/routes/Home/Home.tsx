import styles from './Home.module.css'
import FileList from '../../components/Home/FileList'
import SideMenu from '../../components/Home/SideMenu'

function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.content_container}>
                <SideMenu />
                <FileList />
            </div>
        </main>
    )
}

export default Home
