import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Layout from './components/Layout'
import Limit from './pages/limit'
import Pool from './pages/pool'
import Bridge from './pages/bridge'
import Swap from './pages/swap'


function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/bridge" element={<Bridge />} />
        <Route path="/limit" element={<Limit />} />
        <Route path="/pool" element={<Pool />} />
      </Route>
    </Routes>
  )
}

export default App
