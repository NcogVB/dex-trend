import React, { useState } from "react"
import { useWallet } from "../contexts/WalletContext"
import { ethers } from "ethers"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { TOKENS } from "../utils/SwapTokens"
import { useLiquidity } from "../hooks/useLiquidity"

const ConverterPool: React.FC = () => {
    const { addLiquidity, loading } = useLiquidity()
    const { provider } = useWallet()
    const navigate = useNavigate()

    const [fromToken, setFromToken] = useState(TOKENS[0])
    const [toToken, setToToken] = useState(TOKENS[1])
    const [amount, setAmount] = useState<string>("")
    const [isAdding, setIsAdding] = useState(false)

    const [showFromDropdown, setShowFromDropdown] = useState(false)
    const [showToDropdown, setShowToDropdown] = useState(false)

    const FACTORY_ADDRESS = "0x83DEFEcaF6079504E2DD1DE2c66DCf3046F7bDD7"
    const FACTORY_ABI = [
        "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
    ]

    const handleAddLiquidity = async () => {
        if (!amount) {
            alert("Enter an amount")
            return
        }
        setIsAdding(true)
        try {
            const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider)
            console.log("factory", factory)
            const poolAddress = await factory.getPool(fromToken.address, toToken.address, 500)
            if (poolAddress === ethers.ZeroAddress) {
                alert("No pool exists for this pair. Create pool first.")
                setIsAdding(false)
                return
            }

            console.log("Pool:", poolAddress)

            await addLiquidity({
                tokenA: fromToken.address,
                tokenB: toToken.address,
                amountA: amount,
                amountB: amount, // ✅ single input used for both
            })

            alert("Liquidity added successfully!")
            setAmount("")
        } catch (err) {
            console.error("Error adding liquidity:", err)
            alert("Failed to add liquidity")
        } finally {
            setIsAdding(false)
        }
    }

    return (
        <div className="flex items-center justify-center px-4 min-h-screen">
            <div className="w-full p-[3.5px] md:rounded-[40px] rounded-[20px] max-w-[500px]">
                <div className="bg-white shadow-lg border border-gray-200 w-full md:rounded-[40px] rounded-[20px] px-6 py-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1 text-sm px-4 py-2 text-black hover:text-[#DC2626]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <h2 className="mt-4 mb-6 font-bold text-2xl text-center">Add Liquidity</h2>

                    {/* From token dropdown */}
                    <div className="mb-4 relative">
                        <label className="block mb-2 text-sm font-medium">From Token</label>
                        <div
                            className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                            onClick={() => setShowFromDropdown(!showFromDropdown)}
                        >
                            <img src={fromToken.img} alt="" className="w-6 h-6 rounded-full" />
                            <span className="font-medium">{fromToken.symbol}</span>
                            <ChevronDown className="ml-auto w-4 h-4 text-gray-500" />
                        </div>

                        {showFromDropdown && (
                            <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                                <ul className="divide-y divide-gray-100">
                                    {TOKENS
                                        .filter((t) => t.symbol !== toToken.symbol)
                                        .map((t) => (
                                            <li
                                                key={t.symbol}
                                                onClick={() => {
                                                    setFromToken(t);
                                                    setShowFromDropdown(false);
                                                }}
                                                className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                            >
                                                <img src={t.img} alt="" className="w-6 h-6 rounded-full mr-3" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{t.symbol}</span>
                                                    <span className="text-xs text-gray-500">{t.name}</span>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* To token dropdown */}
                    <div className="mb-4 relative">
                        <label className="block mb-2 text-sm font-medium">To Token</label>
                        <div
                            className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                            onClick={() => setShowToDropdown(!showToDropdown)}
                        >
                            <img src={toToken.img} alt="" className="w-6 h-6 rounded-full" />
                            <span className="font-medium">{toToken.symbol}</span>
                            <ChevronDown className="ml-auto w-4 h-4 text-gray-500" />
                        </div>

                        {showToDropdown && (
                            <div className="absolute mt-2 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                                <ul className="divide-y divide-gray-100">
                                    {TOKENS
                                        .filter((t) => t.symbol !== fromToken.symbol)
                                        .map((t) => (
                                            <li
                                                key={t.symbol}
                                                onClick={() => {
                                                    setToToken(t);
                                                    setShowToDropdown(false);
                                                }}
                                                className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                            >
                                                <img src={t.img} alt="" className="w-6 h-6 rounded-full mr-3" />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{t.symbol}</span>
                                                    <span className="text-xs text-gray-500">{t.name}</span>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        )}
                    </div>


                    {/* Single input for amount */}
                    <div className="mb-4">
                        <label className="block mb-2">Amount</label>
                        <input
                            type="number"
                            placeholder="0.0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    <button
                        onClick={handleAddLiquidity}
                        disabled={isAdding || loading}
                        className="mt-6 w-full bg-[#DC2626] text-white rounded-full py-3 font-semibold disabled:opacity-50"
                    >
                        {isAdding ? "Adding Liquidity..." : "Add Liquidity"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConverterPool
