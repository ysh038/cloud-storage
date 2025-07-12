import { Routes, Route } from 'react-router-dom'

import { Home, Login, SignUp } from './routes'

function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
        </Routes>
    )
}

export default App
