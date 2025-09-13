import React, { createContext, useContext, useState } from "react";
import { ethers } from "ethers";
import { useSwap } from "./SwapContext";

type QuoteResult = {
    dstAmount: string;
    [key: string]: any;
};

type CreateOrderParams = {
    makerToken: string;
    takerToken: string;
    makingAmount: string | bigint;
    takingAmount: string | bigint;
};

type OrderContextType = {
    quote: QuoteResult | null;
    getQuote: (fromToken: string, toToken: string, amount: string) => Promise<QuoteResult>;
    createOrder: (params: CreateOrderParams) => Promise<string>;
    loading: boolean;
    error: string | null;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { account, } = useSwap()

    const [quote, setQuote] = useState<QuoteResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Alternative: Try direct call with different headers
    const getQuote = async (fromToken: string, toToken: string, amount: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3001/api/1inch-quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    src: fromToken,
                    dst: toToken,
                    amount: amount
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log('Quote data:', data);
            if (!data.dstAmount) {
                throw new Error('Invalid response from 1inch API:');
            }
            // Process the 1inch API response
            const fromDecimals = 18;
            const toDecimals = 6;
            const inputAmount = parseFloat(amount) / Math.pow(10, fromDecimals);
            const outputAmount = parseFloat(data.dstAmount) / Math.pow(10, toDecimals);
            console.log("outputAmount", outputAmount);
            const rate = outputAmount / inputAmount;

            const quoteResult: QuoteResult = {
                dstAmount: data.dstAmount,
                rate,
                fromToken,
                toToken,
                fromDecimals,
                toDecimals,
                inputAmount,
                outputAmount,
                estimatedGas: data.estimatedGas || '21000',
                protocols: data.protocols || [],
                ...data // Include all other fields from 1inch API
            };

            setQuote(quoteResult);
            return quoteResult;

        } catch (error: any) {
            console.error('Quote fetch failed:', error);
            setError(`Failed to get quote: ${error.message}`);
            throw error;
        } finally {
            setLoading(false);
        }
    };
    const createOrder = async ({
        makerToken,
        takerToken,
        makingAmount,
        takingAmount,
    }: CreateOrderParams): Promise<string> => {
        const ethereum = (window as any).ethereum;
        const providerInstance = new ethers.BrowserProvider(ethereum);
        const signer = await providerInstance.getSigner();

        if (!signer || !account) {
            throw new Error("Wallet not connected");
        }

        setLoading(true);
        setError(null);

        try {
            // Step 1: Create order on server
            const createResponse = await fetch('http://localhost:3001/api/1inch-create-order-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    makerToken,
                    takerToken,
                    makingAmount: makingAmount.toString(),
                    takingAmount: takingAmount.toString(),
                    maker: account
                })
            });

            if (!createResponse.ok) {
                throw new Error('Failed to create order on server');
            }

            const createResult = await createResponse.json();
            const { orderId, orderHash, typedData } = createResult;

            console.log('=== ORDER CREATED ===');
            console.log('Order ID:', orderId);
            console.log('Order Hash:', orderHash);

            // Step 2: Sign the order locally
            const signature = await signer.signTypedData(
                typedData.domain,
                { Order: typedData.types.Order },
                typedData.message
            );

            console.log("Generated signature:", signature);

            // Step 3: Submit using the order ID
            const submitResponse = await fetch('http://localhost:3001/api/1inch-submit-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderId,    // Send the order ID
                    signature: signature
                })
            });

            if (!submitResponse.ok) {
                const errorData = await submitResponse.json();
                console.error('Submit error response:', errorData);
                throw new Error(`Failed to submit order: ${errorData.details || errorData.error || errorData.message}`);
            }

            const submitResult = await submitResponse.json();
            console.log("Order submitted successfully:", submitResult);

            return orderHash;

        } catch (e: any) {
            console.error("Order creation failed:", e);
            setError(e.message || "Failed to create order");
            throw e;
        } finally {
            setLoading(false);
        }
    };
    const contextValue: OrderContextType = {
        quote,
        getQuote,
        createOrder,
        loading,
        error,
    };

    return (
        <OrderContext.Provider value={contextValue}>
            {children}
        </OrderContext.Provider>
    );
};

// Usage helper
export function useOrder() {
    const ctx = useContext(OrderContext);
    if (!ctx) throw new Error("useOrder must be used within OrderProvider");
    return ctx;
}
