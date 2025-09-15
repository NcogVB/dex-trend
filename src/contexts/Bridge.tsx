"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createAcrossClient } from "@across-protocol/app-sdk";
import { useWalletClient, usePublicClient, useSwitchChain } from "wagmi";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import { polygon, arbitrum } from "viem/chains";

interface QuoteResult {
  swapQuote: any;
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
  getQuote: (
    amountHuman: string,
    originChainId: number,
    destinationChainId: number,
    inputToken: `0x${string}`,
    outputToken: `0x${string}`
  ) => Promise<QuoteResult | null>;

  executeQuote: (
    quote: QuoteResult,
    originChainId: number
  ) => Promise<void>;

  checkAndApprove: (
    amountHuman: string,
    originChainId: number,
    inputToken: `0x${string}`
  ) => Promise<boolean>;

  isFetchingQuote: boolean;
  isExecutingBridge: boolean;
  isApproving: boolean;
  lastQuote?: QuoteResult | null;
  error?: string | null;
  progress: ProgressEvent[];
}

const BridgeContext = createContext<BridgeContextValue | undefined>(undefined);

export const BridgeProvider = ({ children }: { children: ReactNode }) => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [progress, setProgress] = useState<ProgressEvent[]>([]);

  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [isExecutingBridge, setIsExecutingBridge] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const [lastQuote, setLastQuote] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acrossClient, setAcrossClient] = useState<any>(null);
  const { switchChainAsync } = useSwitchChain()

  // Initialize Across client
  useEffect(() => {
    const client = createAcrossClient({
      integratorId: "0xdead", // Replace with your Across integrator ID
      chains: [polygon, arbitrum],
    });
    setAcrossClient(client);
  }, []);

  const parseAmount = (amountHuman: string) => parseUnits(amountHuman, 6);
  const formatAmount = (amount: bigint) => formatUnits(amount, 6);

  /** Progress batching */
  const pushProgress = (event: ProgressEvent) => {
    setProgress(prev => {
      if (prev.some(p => p.step === event.step && p.status === event.status)) {
        return prev;
      }
      return [...prev, event];
    });
  };

  /** Check and approve tokens if needed */
  const checkAndApprove = async (
    amountHuman: string,
    originChainId: number,
    inputToken: `0x${string}`
  ): Promise<boolean> => {
    if (!walletClient?.account?.address || !publicClient || !acrossClient) {
      throw new Error("Wallet not connected or clients not available");
    }

    setIsApproving(true);
    setError(null);

    try {
      const amount = parseAmount(amountHuman);
      const spenderAddress = await acrossClient.getSpokePoolAddress(originChainId);

      const allowance = await publicClient.readContract({
        address: inputToken,
        abi: erc20Abi,
        functionName: "allowance",
        args: [walletClient.account.address, spenderAddress],
      });

      if (allowance >= amount) return true;

      const hash = await walletClient.writeContract({
        address: inputToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [spenderAddress, amount],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Approval failed";
      setError(errorMessage);
      return false;
    } finally {
      setIsApproving(false);
    }
  };


  /** Fetch a bridging quote via Across */
  const getQuote = async (
    amountHuman: string,
    originChainId: number,
    destinationChainId: number,
    inputToken: `0x${string}`,
    outputToken: `0x${string}`
  ): Promise<QuoteResult | null> => {
    setIsFetchingQuote(true);
    setError(null);

    try {
      if (!walletClient?.account?.address) throw new Error("Wallet not connected");
      if (!acrossClient) throw new Error("Across client not initialized");

      const route = {
        originChainId,
        destinationChainId,
        inputToken,
        outputToken,
      };

      const swapQuote = await acrossClient.getSwapQuote({
        route,
        amount: parseAmount(amountHuman).toString(),
        depositor: walletClient.account.address as `0x${string}`,
      });

      const outputAmount = formatAmount(
        swapQuote.outputAmount || swapQuote.minOutputAmount
      );

      const result: QuoteResult = {
        swapQuote,
        outputAmount,
        estimatedFillTimeSec:
          swapQuote.estimatedFillTimeSec ||
          swapQuote.expectedFillTime ||
          120,
        fees: swapQuote.totalRelayFee || swapQuote.fees,
      };

      setLastQuote(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get quote";
      setError(msg);
      setLastQuote(null);
      return null;
    } finally {
      setIsFetchingQuote(false);
    }
  };


  /** Execute an Across quote */
  const executeQuote = async (
    quote: QuoteResult,
    originChainId: number
  ) => {
    setIsExecutingBridge(true);
    setError(null);

    try {
      if (!walletClient) throw new Error("Wallet not connected");
      if (!acrossClient) throw new Error("Across client not ready");

      // ensure wallet is on correct origin chain
      if (walletClient.chain?.id !== originChainId) {
        await switchChainAsync({ chainId: originChainId });
      }

      await acrossClient.executeSwapQuote({
        walletClient,
        swapQuote: quote.swapQuote,
        onProgress: (progress: any) => {
          const event: ProgressEvent = {
            step: progress.step,
            status: progress.status,
            txHash: progress.txReceipt?.transactionHash,
            depositId: progress.depositId,
            fillTxTimestamp: progress.fillTxTimestamp,
          };
          pushProgress(event);
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Quote execution failed";
      setError(msg);
      throw err;
    } finally {
      setIsExecutingBridge(false);
    }
  };


  return (
    <BridgeContext.Provider
      value={{
        getQuote,
        executeQuote,
        checkAndApprove,
        isFetchingQuote,
        isExecutingBridge,
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
  if (!ctx) throw new Error("useBridge must be used within BridgeProvider");
  return ctx;
};
