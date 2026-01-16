import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Limit from "./pages/limit";
import Home from "./pages/Home";
import AmmDashboard from "./components/BotDashboard";
import PolicyDashboard from "./pages/policy/Policy";
import LendingBorrowing from "./pages/LendingBorrowing/LB";
import { ToastProvider } from "./components/Toast";
import PreSell from "./components/PreSell";
import Futures from "./pages/Futures";
import Options from "./pages/Options";
import AdminDashboard from "./components/BotDashboard";


function App() {
  return (
    <>
      <ToastProvider>

        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/presell" element={<PreSell />} />
            <Route path="/Policy" element={<PolicyDashboard />} />
            <Route path="/LendingBorrowing" element={<LendingBorrowing />} />
            <Route path="/Dashboard" element={<AmmDashboard />} />
            <Route path="/exchange" element={<Limit />} />
            <Route path="/Futures" element={<Futures />} />
            <Route path="/Options" element={<Options />} />
            <Route path="/AdminDashboard" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </ToastProvider>
    </>
  );
}

export default App;
