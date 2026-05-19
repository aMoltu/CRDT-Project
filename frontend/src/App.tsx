import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import GCounterDemo from './pages/GCounterDemo'
import GSetDemo from './pages/GSetDemo'
import RGADemo from './pages/RGADemo'
import GCounterOnline from './pages/GCounterOnline'
import GSetOnline from './pages/GSetOnline'
import RGAOnline from './pages/RGAOnlineDemo'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gcounter" element={<GCounterDemo />} />
        <Route path="/gset" element={<GSetDemo />} />
        <Route path="/rga" element={<RGADemo />} />
        <Route path="/gcounter-online" element={<GCounterOnline />} />
        <Route path="/gset-online" element={<GSetOnline />} />
        <Route path="/rga-online" element={<RGAOnline />} />
      </Routes>
    </BrowserRouter>
  )
}
