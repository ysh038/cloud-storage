export interface ITokenData {
    access_token: string
    refresh_token: string
    token_type: string
}

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

// 토큰 저장
export const saveTokens = (tokenData: ITokenData): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokenData.access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refresh_token)
}

// Access Token 가져오기
export const getAccessToken = (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
}

// Refresh Token 가져오기
export const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
}

// 토큰 삭제 (로그아웃)
export const clearTokens = (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
}

// 로그인 상태 확인 (추가!)
export const isLoggedIn = (): boolean => {
    const token = getAccessToken()
    return token !== null && token !== ''
}

// Access Token 갱신
export const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return null

    try {
        const response = await fetch('http://localhost:8000/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh_token: refreshToken,
            }),
        })

        if (response.ok) {
            const data = await response.json()
            localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token)
            return data.access_token
        } else {
            // Refresh Token도 만료됨
            clearTokens()
            return null
        }
    } catch (error) {
        console.error('Token refresh failed:', error)
        clearTokens()
        return null
    }
}

// 토큰 유효성 검사 (선택사항)
export const isTokenValid = (): boolean => {
    const token = getAccessToken()
    if (!token) return false

    try {
        // JWT 토큰의 payload 부분을 디코딩 (검증 없이)
        const payload = JSON.parse(atob(token.split('.')[1]))
        const currentTime = Math.floor(Date.now() / 1000)
        return payload.exp > currentTime
    } catch (error) {
        return false
    }
}

// 자동 토큰 갱신이 필요한지 확인
export const shouldRefreshToken = (): boolean => {
    const token = getAccessToken()
    if (!token) return false

    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const currentTime = Math.floor(Date.now() / 1000)
        // 만료 5분 전에 갱신
        return payload.exp - currentTime < 300
    } catch (error) {
        return false
    }
}
