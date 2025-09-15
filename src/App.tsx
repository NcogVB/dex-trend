import { Route, Routes } from 'react-router-dom'
// import Home from './pages/Home'
import Layout from './components/Layout'
import Limit from './pages/limit'
import Pool from './pages/pool'
import Bridge from './pages/bridge'
import Swap from './pages/swap'
import ConverterPool from './components/ConverterPool'
import Converter1 from './components/Converter1'
import Home from './pages/Home'


function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/bridge" element={<Bridge />} />
        <Route path="/limit" element={<Limit />} />
        <Route path="/pool" element={<Pool />} />
        <Route path="/addlp" element={<ConverterPool />} />
        <Route path="/removeLp" element={<Converter1 />} />
      </Route>
    </Routes>
  )
}

export default App
