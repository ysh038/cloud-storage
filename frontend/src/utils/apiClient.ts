import axios from 'axios'

import { getAccessToken, refreshAccessToken, clearTokens } from './tokenManager'

const apiClient = axios.create({
    baseURL: 'http://localhost:8000',
})

// 요청 인터셉터: 모든 요청에 Access Token 추가
apiClient.interceptors.request.use(
    (config) => {
        const token = getAccessToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error),
)

// 응답 인터셉터: 401 에러 시 토큰 갱신 시도
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            const newToken = await refreshAccessToken()
            if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`
                return apiClient(originalRequest)
            } else {
                // 토큰 갱신 실패 시 로그인 페이지로 리다이렉트
                clearTokens()
                localStorage.removeItem('cms_email')
                localStorage.removeItem('cms_name')
                window.location.href = '/login'
            }
        }

        return Promise.reject(error)
    },
)

export default apiClient
