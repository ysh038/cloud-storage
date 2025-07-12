import { useMutation } from '@tanstack/react-query'
import bcrypt from 'bcryptjs'
import { useNavigate } from 'react-router-dom'

import apiClient from '../../utils/apiClient'

interface ISignupData {
    email: string
    password: string
    name: string
}

const signup = async (signupData: ISignupData) => {
    try {
        const hashedPassword = await bcrypt.hash(signupData.password, 10)
        const response = await apiClient.post('http://localhost:8000/users/', {
            email: signupData.email,
            password: hashedPassword,
            name: signupData.name,
        })
        return response.data
    } catch (error) {
        console.error(error)
        throw error
    }
}

export const useSignup = () => {
    const navigate = useNavigate()

    return useMutation({
        mutationFn: signup,
        onSuccess: () => {
            navigate('/login')
        },
    })
}
