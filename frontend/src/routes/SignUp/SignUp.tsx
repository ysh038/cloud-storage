import { useState } from 'react'

import styles from './SignUp.module.css'
import { useSignup } from '../../queries/login/signup'

function SignUp() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')

    const { mutate: signup } = useSignup()

    const handleSignUp = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        signup({ email, password, name })
    }

    return (
        <div className={styles.signup_container}>
            <form className={styles.signup_form} onSubmit={handleSignUp}>
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
                <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <button className={styles.signup_button} type="submit">
                    SignUp
                </button>
            </form>
        </div>
    )
}

export default SignUp
