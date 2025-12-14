import { useState } from "react";
import { useWallet } from "../contexts/WalletContext";
import { ChevronDown } from "lucide-react";

const ChainSwitcher = () => {
    const { chainId, switchToSkyHigh, switchToBSC } = useWallet();

    const CHAIN =
        chainId === 137
            ? { name: "Polygon", color: "bg-purple-600" }
            : chainId === 1476
                ? { name: "SkyHigh", color: "bg-blue-600" }
                : chainId === 56
                    ? { name: "Binance", color: "bg-yellow-500" }
                    : { name: "Unknown", color: "bg-gray-500" };

    const [open, setOpen] = useState(false);

    const handleSwitch = async (fn: () => Promise<void>) => {
        try {
            await fn();
            window.location.reload();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center px-4 py-2 bg-[#F8F8F8] border rounded-lg text-sm text-gray-800 hover:bg-gray-200 transition"
            >
                <div className={`w-2 h-2 mr-2 rounded-full ${CHAIN.color}`}></div>
                {CHAIN.name}
                <ChevronDown
                    className={`w-4 h-4 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpen(false)}
                    />

                    <div className="absolute right-0 mt-2 w-48 z-20 bg-white border rounded-lg shadow-lg py-2">


                        <button
                            onClick={() => handleSwitch(switchToSkyHigh)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                        >
                            Switch to SkyHigh
                        </button>

                        <button
                            onClick={() => handleSwitch(switchToBSC)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                        >
                            Switch to Binance (BSC)
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChainSwitcher;
