import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'

import apiClient from '../../utils/apiClient'
import { saveTokens } from '../../utils/tokenManager'

interface ILoginData {
    email: string
    password: string
}

const login = async (loginData: ILoginData) => {
    const response = await apiClient.post(
        'http://localhost:8000/login/',
        loginData,
    )
    return response.data
}

export const useLogin = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            localStorage.setItem('cms_email', data.user.email)
            localStorage.setItem('cms_name', data.user.name)
            saveTokens({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                token_type: data.token_type,
            })
            queryClient.invalidateQueries()
        },
        onError: () => {
            alert('로그인 실패')
        },
    })
}
