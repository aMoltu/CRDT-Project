import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import GCounterDemo from './pages/GCounterDemo'
import GSetDemo from './pages/GSetDemo'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gcounter" element={<GCounterDemo />} />
        <Route path="/gset" element={<GSetDemo />} />
      </Routes>
    </BrowserRouter>
  )
}
