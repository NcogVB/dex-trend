import { CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react"

interface TransferStatusProps {
    depositTxHash?: string
    fillTxHash?: string
    depositTime?: number
    fillTime?: number
    amount?: string
    fee?: string
    currentStep?: "approve" | "deposit" | "fill" | "completed"
    isComplete?: boolean
    error?: string
    onClose: () => void
}

const TransferStatus = ({
    depositTxHash,
    fillTxHash,
    depositTime,
    fillTime,
    amount,
    currentStep = "approve",
    isComplete = false,
    error,
    onClose,
}: TransferStatusProps) => {
    const duration = fillTime && depositTime ? fillTime - depositTime : 0

    const getStepIcon = (step: string, isActive: boolean, isCompleted: boolean) => {
        console.log(step)
        if (error && isActive) {
            return <AlertCircle className="w-8 h-8 text-blue-400" />
        }
        if (isCompleted) {
            return <CheckCircle className="w-8 h-8 text-green-400" />
        }
        if (isActive) {
            return <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        }
        return <Clock className="w-8 h-8 text-gray-500" />
    }

    const getStepStatus = (stepName: string) => {
        const steps = ["approve", "deposit", "fill"]
        const currentIndex = steps.indexOf(currentStep)
        const stepIndex = steps.indexOf(stepName)

        if (error && stepIndex === currentIndex) return { isActive: true, isCompleted: false }
        if (stepIndex < currentIndex || isComplete) return { isActive: false, isCompleted: true }
        if (stepIndex === currentIndex) return { isActive: true, isCompleted: false }
        return { isActive: false, isCompleted: false }
    }

    const approveStatus = getStepStatus("approve")
    const depositStatus = getStepStatus("deposit")
    const fillStatus = getStepStatus("fill")

    const getConnectorColor = (isCompleted: boolean) =>
        isCompleted ? "bg-green-400" : "bg-gray-600"

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0  backdrop-blur-sm" />
            <div className="relative bg-[#1e1e1e] text-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                {/* Progress Steps */}
                <div className="flex justify-center mb-6">
                    <div className="flex items-center space-x-4">
                        {/* Approve Step */}
                        <div className="flex flex-col items-center">
                            {getStepIcon("approve", approveStatus.isActive, approveStatus.isCompleted)}
                            <span className="mt-2 text-sm">Approve</span>
                        </div>

                        {/* Connector */}
                        <div className={`h-0.5 w-8 ${getConnectorColor(approveStatus.isCompleted)}`} />

                        {/* Deposit Step */}
                        <div className="flex flex-col items-center">
                            {getStepIcon("deposit", depositStatus.isActive, depositStatus.isCompleted)}
                            <span className="mt-2 text-sm">Deposit</span>
                        </div>

                        {/* Connector */}
                        <div className={`h-0.5 w-8 ${getConnectorColor(depositStatus.isCompleted)}`} />

                        {/* Fill Step */}
                        <div className="flex flex-col items-center">
                            {getStepIcon("fill", fillStatus.isActive, fillStatus.isCompleted)}
                            <span className="mt-2 text-sm">Fill</span>
                        </div>
                    </div>
                </div>

                {/* Status Message */}
                <h2 className="text-center text-2xl font-bold mb-2">
                    {error ? "Transfer failed" :
                        isComplete ? "Transfer successful!" :
                            currentStep === "approve" ? "Approving tokens..." :
                                currentStep === "deposit" ? "Processing deposit..." :
                                    currentStep === "fill" ? "Waiting for fill..." :
                                        "Transfer in progress..."}
                </h2>

                {/* Error Message */}
                {error && (
                    <p className="text-center text-blue-400 mb-4 text-sm">
                        {error}
                    </p>
                )}

                {/* Duration */}
                <p className="text-center text-gray-400 mb-6">
                    {duration > 0 && `Completed in ${(duration / 1000).toFixed(0)}s`}
                    {!isComplete && !error && currentStep === "fill" && "This may take a few moments..."}
                </p>

                {/* Transaction Details */}
                <div className="space-y-3 text-sm bg-gray-900/50 rounded-xl p-4">

                    <div className="flex justify-between">
                        <span>Amount</span>
                        <span>{amount || "Loading..."}</span>
                    </div>

                </div>

                {/* Transaction Links */}
                <div className="mt-4 flex justify-between text-sm">
                    {depositTxHash && (
                        <a
                            href={`https://polygonscan.com/tx/${depositTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline hover:text-blue-300 transition"
                        >
                            View Source Tx ↗
                        </a>
                    )}
                    {fillTxHash && (
                        <a
                            href={`https://arbiscan.io/tx/${fillTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline hover:text-blue-300 transition"
                        >
                            View Dest Tx ↗
                        </a>
                    )}
                </div>

                {/* Across Transaction Tracker */}
                <div className="mt-6 text-center text-sm text-gray-400">
                    You can also track this transfer on{" "}
                    <a
                        href="https://app.across.to/transactions?from=42161&to=137&inputToken=USDC&outputToken=USDC"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline hover:text-blue-300 transition"
                    >
                        Across Transactions page ↗
                    </a>
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg font-medium transition ${error
                            ? "bg-blue-600 hover:bg-blue-500 text-white"
                            : isComplete
                                ? "bg-green-600 hover:bg-green-500 text-white"
                                : "bg-blue-600 hover:bg-blue-500 text-white"
                            }`}
                    >
                        {error ? "Retry" : "Close"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TransferStatus
