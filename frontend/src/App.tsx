import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import GCounterDemo from './pages/GCounterDemo'
import GSetDemo from './pages/GSetDemo'
import RGADemo from './pages/RGADemo'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gcounter" element={<GCounterDemo />} />
        <Route path="/gset" element={<GSetDemo />} />
        <Route path="/rga" element={<RGADemo />} />
      </Routes>
    </BrowserRouter>
  )
}
