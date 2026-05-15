import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import GCounterDemo from './pages/GCounterDemo'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gcounter" element={<GCounterDemo />} />
      </Routes>
    </BrowserRouter>
  )
}
