import { create } from 'zustand'

interface ILoginState {
    email: string
    name: string
    setLoginData: (email: string, name: string) => void
}

export const useLoginStore = create<ILoginState>((set, get) => ({
    email: '',
    name: '',
    setLoginData: (email: string, name: string) => set({ email, name }),
}))
