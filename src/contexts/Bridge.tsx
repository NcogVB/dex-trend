"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createAcrossClient } from "@across-protocol/app-sdk";
import { useWalletClient, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import { polygon, arbitrum } from "viem/chains";

const POLYGON_USDCE =
  "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`;
const ARBITRUM_USDCE =
  "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`;

interface QuoteResult {
  swapQuote: any; // Store the full swap quote from Across
  outputAmount: string;
  estimatedFillTimeSec: number;
  fees: any;
}
interface ProgressEvent {
  step: string;
  status: string;
  txHash?: string;
  depositId?: string;
  fillTxTimestamp?: number;
}
interface BridgeContextValue {
  getQuote: (amountHuman: string) => Promise<QuoteResult | null>;
  executeQuote: (quote: QuoteResult) => Promise<void>;
  checkAndApprove: (amountHuman: string) => Promise<boolean>;
  isLoading: boolean;
  isApproving: boolean;
  lastQuote?: QuoteResult | null;
  error?: string | null;
  progress: ProgressEvent[]; // 👈 add this line
}


const BridgeContext = createContext<BridgeContextValue | undefined>(
  undefined,

);

export const BridgeProvider = ({ children }: { children: ReactNode }) => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [lastQuote, setLastQuote] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acrossClient, setAcrossClient] = useState<any>(null);

  // Initialize Across client
  useEffect(() => {
    const client = createAcrossClient({
      integratorId: "0xdead", // Replace with your integrator ID from Across
      chains: [polygon, arbitrum],
      // Add testnet configuration if needed
      // useTestnet: false,
    });
    setAcrossClient(client);
  }, []);

  const parseAmount = (amountHuman: string) => parseUnits(amountHuman, 6);
  const formatAmount = (amount: bigint) => formatUnits(amount, 6);

  /** Check and approve tokens if needed */
  const checkAndApprove = async (amountHuman: string): Promise<boolean> => {
    if (!walletClient?.account?.address || !publicClient || !acrossClient) {
      throw new Error("Wallet not connected or clients not available");
    }

    setIsApproving(true);
    setError(null);

    try {
      const amount = parseAmount(amountHuman);
      const spenderAddress = await acrossClient.getSpokePoolAddress(polygon.id);

      // Check current allowance
      const allowance = await publicClient.readContract({
        address: POLYGON_USDCE,
        abi: erc20Abi,
        functionName: "allowance",
        args: [walletClient.account.address, spenderAddress],
      });

      // If allowance is sufficient, return true
      if (allowance >= amount) {
        return true;
      }

      // Need to approve
      const hash = await walletClient.writeContract({
        address: POLYGON_USDCE,
        abi: erc20Abi,
        functionName: "approve",
        args: [spenderAddress, amount],
      });

      // Wait for approval transaction to be confirmed
      await publicClient.waitForTransactionReceipt({ hash });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Approval failed";
      setError(errorMessage);
      return false;
    } finally {
      setIsApproving(false);
    }
  };

  /** Fetch a bridging quote via Across */
  const getQuote = async (amountHuman: string): Promise<QuoteResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!walletClient?.account?.address) {
        throw new Error("Wallet not connected");
      }

      if (!acrossClient) {
        throw new Error("Across client not initialized");
      }

      const route = {
        originChainId: polygon.id, // Use the chain id directly from viem
        destinationChainId: arbitrum.id, // Use the chain id directly from viem
        inputToken: POLYGON_USDCE,
        outputToken: ARBITRUM_USDCE,
      };

      console.log("Fetching quote for route:", route);

      const swapQuote = await acrossClient.getSwapQuote({
        route,
        amount: parseAmount(amountHuman).toString(), // Convert to string
        depositor: walletClient.account.address as `0x${string}`,
      });

      console.log("Received swap quote:", swapQuote);

      const outputAmount = formatAmount(BigInt(swapQuote.outputAmount || swapQuote.minOutputAmount));

      const result: QuoteResult = {
        swapQuote, // Store the full quote object
        outputAmount,
        estimatedFillTimeSec: swapQuote.estimatedFillTimeSec || swapQuote.expectedFillTime || 120,
        fees: swapQuote.totalRelayFee || swapQuote.fees,
      };

      setLastQuote(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get quote";
      console.error("Quote error:", err);
      setError(msg);
      setLastQuote(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /** Execute an Across quote */
  const executeQuote = async (quote: QuoteResult) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!walletClient) throw new Error("Wallet not connected");
      if (!acrossClient) throw new Error("Across client not ready");

      console.log("Executing quote:", quote);
      console.log("Wallet client chain:", walletClient.chain);

      // Make sure wallet is on the correct chain (Polygon)
      if (walletClient.chain?.id !== polygon.id) {
        throw new Error(`Please switch to Polygon network. Current: ${walletClient.chain?.name}, Required: ${polygon.name}`);
      }

      // Use executeSwapQuote instead of executeQuote for swap quotes
      await acrossClient.executeSwapQuote({
        walletClient,
        swapQuote: quote.swapQuote, // Pass the full swap quote object
        onProgress: (progress: any) => {
          const event: ProgressEvent = {
            step: progress.step,
            status: progress.status,
            txHash: progress.txReceipt?.transactionHash,
            depositId: progress.depositId,
            fillTxTimestamp: progress.fillTxTimestamp,
          };

          setProgress((prev) => [...prev, event]);
          console.log("Bridge progress:", progress);

          if (progress.step === "approve" && progress.status === "txSuccess") {
            console.log("Token approval successful:", progress.txReceipt);
          }

          if (progress.step === "deposit" && progress.status === "txSuccess") {
            console.log("Deposit successful:", {
              depositId: progress.depositId,
              txReceipt: progress.txReceipt,
            });
          }

          if (progress.step === "fill" && progress.status === "txSuccess") {
            console.log("Fill successful:", {
              fillTxTimestamp: progress.fillTxTimestamp,
              txReceipt: progress.txReceipt,
              actionSuccess: progress.actionSuccess,
            });
          }
          if (progress.step === "deposit" && progress.status === "txSuccess") {
            setProgress((prev) => [
              ...prev,
              {
                step: "waiting",
                status: "pending",
              },
            ]);
          }
        },
      });

      console.log("Bridge execution completed successfully");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Quote execution failed";
      console.error("Execution error:", err);
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BridgeContext.Provider
      value={{
        getQuote,
        executeQuote,
        checkAndApprove,
        isLoading,
        isApproving,
        lastQuote,
        progress,
        error,
      }}
    >
      {children}
    </BridgeContext.Provider>
  );
};

export const useBridge = () => {
  const ctx = useContext(BridgeContext);
  if (!ctx)
    throw new Error("useBridge must be used within BridgeProvider");
  return ctx;
};