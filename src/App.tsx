import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Limit from "./pages/limit";
import Pool from "./pages/pool";
import Bridge from "./pages/bridge";
import Swap from "./pages/swap";
import ConverterPool from "./components/ConverterPool";
import Converter1 from "./components/Converter1";
import Home from "./pages/Home";
import AmmDashboard from "./components/BotDashboard";
import PolicyDashboard from "./pages/policy/Policy";
import LendingBorrowing from "./pages/LendingBorrowing/LB";
import { ToastProvider } from "./components/Toast";

function App() {
  return (
    <>
      {/* ✅ ToastContainer must be outside Routes */}
      <ToastProvider>

        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/Policy" element={<PolicyDashboard />} />
            <Route path="/bridge" element={<Bridge />} />
            <Route path="/LendingBorrowing" element={<LendingBorrowing />} />
            <Route path="/PoolData" element={<AmmDashboard />} />
            <Route path="/exchange" element={<Limit />} />
            <Route path="/pool" element={<Pool />} />
            <Route path="/addlp" element={<ConverterPool />} />
            <Route path="/removeLp" element={<Converter1 />} />
          </Route>
        </Routes>
      </ToastProvider>
    </>
  );
}

export default App;
