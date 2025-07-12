import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import styles from './Login.module.css'
import { useLogin } from '../../queries/login/login'

function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const loginMutation = useLogin()

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        loginMutation.mutate(
            { email, password },
            {
                onSuccess: () => {
                    navigate('/')
                },
            },
        )
    }

    return (
        <div className={styles.login_container}>
            <h1>Login</h1>
            <form className={styles.login_form} onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button className={styles.login_button} type="submit">
                    Login
                </button>
            </form>
        </div>
    )
}

export default Login
