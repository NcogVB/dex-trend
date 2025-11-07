import React, { useState, useEffect, useRef } from "react";
import { widget, type IChartingLibraryWidget } from "../charting_library";
import BinanceDatafeed from "../utils/CryptoDatafeed";
import { ethers } from "ethers";
import ExecutorABI from "../ABI/LimitOrder.json";

interface TradingDashboardProps {
    className?: string;
    fullScreen?: boolean;
    showOrders?: boolean;
    pair?: string; // e.g. "BNBUSDT"
}

function getLanguageFromURL(): string | null {
    const regex = new RegExp("[\\?&]lang=([^&#]*)");
    const results = regex.exec(window.location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

const EXECUTOR_ADDRESS = "0xa8a95b7fD8d317daBc55172316bF76453b970F57";

const TradingDashboard: React.FC<TradingDashboardProps> = ({
    className = "",
    fullScreen = false,
    showOrders = true,
    pair = "BNBUSDT", // default fallback
}) => {
    const [activeTab, setActiveTab] = useState<"open" | "history">("open");
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [currentWidget, setCurrentWidget] = useState<IChartingLibraryWidget | null>(null);

    // Orders state
    const [openOrders, setOpenOrders] = useState<any[]>([]);
    const [orderHistory, setOrderHistory] = useState<any[]>([]);

    const defaultProps = {
        symbol: pair,
        interval: "1D" as "1D",
        libraryPath: "/charting_library/",
        chartsStorageUrl: "https://saveload.tradingview.com",
        chartsStorageApiVersion: "1.1",
        clientId: "tradingview.com",
        userId: "public_user_id",
        fullscreen: false,
        autosize: true,
        studiesOverrides: {},
    };

    const createChart = () => {
        if (currentWidget) {
            currentWidget.remove();
        }

        const datafeed = new BinanceDatafeed();

        const widgetOptions = {
            symbol: pair,
            datafeed,
            interval: defaultProps.interval,
            container: chartContainerRef.current!,
            library_path: defaultProps.libraryPath,
            locale: getLanguageFromURL() || "en",
            disabled_features: [
                "use_localstorage_for_settings",
                "volume_force_overlay",
                "header_compare",
                "header_screenshot",
                "header_chart_type",
            ],
            enabled_features: ["study_templates", "side_toolbar_in_fullscreen_mode"],
            charts_storage_url: defaultProps.chartsStorageUrl,
            charts_storage_api_version: defaultProps.chartsStorageApiVersion,
            client_id: defaultProps.clientId,
            user_id: defaultProps.userId,
            fullscreen: defaultProps.fullscreen,
            autosize: defaultProps.autosize,
            studies_overrides: {
                "smoothed moving average.length": 100,
                "smoothed moving average.source": "close",
                "smoothed moving average.offset": 0,
                "smoothed moving average.style": 0,
                "smoothed moving average.linewidth": 2,
                "smoothed moving average.plottype": "line",
                "smoothed moving average.color": "#2196F3",
            },
            theme: "light",
            custom_css_url: "./charting_library/static/bundles/themed.css",
            overrides: {
                volumePaneSize: "medium",
                "mainSeriesProperties.candleStyle.upColor": "#26a69a",
                "mainSeriesProperties.candleStyle.downColor": "#ef5350",
                "mainSeriesProperties.candleStyle.drawWick": true,
                "mainSeriesProperties.candleStyle.drawBorder": true,
                "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
                "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
            },
        } as any;

        // @ts-ignore
        const tvWidget = new widget(widgetOptions);

        tvWidget.onChartReady(() => {
            console.log("Chart is ready");
            tvWidget.chart().createStudy("Smoothed Moving Average", false, false, {
                length: 100,
                source: "close",
                offset: 0,
                "style.linewidth": 2,
                "style.color": "#2196F3",
            });
        });

        tvWidget.onChartReady(() => {
            tvWidget
                .chart()
                .onDataLoaded()
                .subscribe(null, () => {
                    console.log("Chart data loaded successfully");
                });
        });

        setCurrentWidget(tvWidget);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            createChart();
        }, 100);

        return () => {
            clearTimeout(timer);
            if (currentWidget) {
                currentWidget.remove();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pair]);

    const NoOrdersIcon: React.FC = () => (
        <svg className="mx-auto" width="58" height="58" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.33301 2.33325H55.6663" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" />
            <path
                d="M21 25L24.4477 21.5522C25.3366 20.6634 25.781 20.2189 26.3333 20.2189C26.8856 20.2189 27.3301 20.6634 28.219 21.5522L29.7811 23.1143C30.6699 24.0032 31.1144 24.4477 31.6667 24.4477C32.219 24.4477 32.6634 24.0032 33.5523 23.1143L37 19.6666"
                stroke="#2563EB"
                strokeWidth="3.5"
                strokeLinecap="round"
            />
            <path d="M29 53L29 42.3333" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M23.667 55.6667L29.0003 53" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M34.3333 55.6667L29 53" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" />
            <path
                d="M50.3337 2.33325V24.9999C50.3337 33.1709 50.3337 37.2564 47.6558 39.7948C44.9779 42.3333 40.6679 42.3333 32.0479 42.3333H25.9527C17.3327 42.3333 13.0228 42.3333 10.3449 39.7948C7.66699 37.2564 7.66699 33.1709 7.66699 24.9999V2.33325"
                stroke="#2563EB"
                strokeWidth="3.5"
            />
        </svg>
    );

    // ---------- CONTRACT ORDER FETCHING LOGIC ----------
    const MIN_ERC20_ABI = ["function decimals() view returns (uint8)"];

    // Helper: create a provider (use MetaMask if present; fallback to public RPC)
    function getReadProvider() {
        try {
            if (typeof (window as any).ethereum !== "undefined") {
                return new ethers.BrowserProvider((window as any).ethereum);
            } else {
                return new ethers.JsonRpcProvider("https://api.skyhighblockchain.com");
            }
        } catch (e) {
            console.warn("Failed to create provider, falling back to JsonRpcProvider:", e);
            return new ethers.JsonRpcProvider("https://api.skyhighblockchain.com");
        }
    }

    // Fetch orders and set state
    const fetchOrders = async () => {
        try {
            const provider = getReadProvider();
            const executor = new ethers.Contract(EXECUTOR_ADDRESS, ExecutorABI.abi, provider);

            // Ensure ABI has nextOrderId/getOrder
            if (!executor.nextOrderId || !executor.getOrder) {
                console.error("ABI mismatch: executor.nextOrderId or executor.getOrder is missing in ABI");
                return;
            }

            const nextIdBN = await executor.nextOrderId();
            const nextId = Number(nextIdBN || 0);

            if (nextId <= 1) {
                // no orders
                setOpenOrders([]);
                setOrderHistory([]);
                return;
            }

            // token decimals cache
            const decimalsCache: Record<string, number> = {};

            const ordersRaw: any[] = [];
            const BATCH = 20; // batch size for parallel calls
            for (let start = 1; start < nextId; start += BATCH) {
                const end = Math.min(nextId, start + BATCH);
                const batchPromises: Promise<any>[] = [];
                for (let id = start; id < end; id++) {
                    batchPromises.push(
                        // getOrder typically returns tuple: (maker, tokenIn, tokenOut, poolFee, pool, amountIn, amountOutMin, targetSqrtPriceX96, triggerAbove, expiry, filled, cancelled)
                        executor.getOrder(id).then((ord: any) => ({ id, ord }))
                    );
                }
                const batchResults = await Promise.allSettled(batchPromises);
                for (const res of batchResults) {
                    if (res.status === "fulfilled") {
                        ordersRaw.push(res.value);
                    } else {
                        console.warn("getOrder failed in batch:", (res as any).reason?.message || res);
                    }
                }
            }

            const open: any[] = [];
            const history: any[] = [];

            for (const item of ordersRaw) {
                const id = item.id;
                const ord = item.ord;

                // standardize fields - ethers v6 returns BigInt for uints
                const maker = ord.maker;
                const tokenIn = ord.tokenIn;
                const tokenOut = ord.tokenOut;
                const poolFee = Number(ord.poolFee);
                const pool = ord.pool;
                const amountInRaw = ord.amountIn; // BigInt
                const amountOutMinRaw = ord.amountOutMin; // BigInt
                const targetSqrt = ord.targetSqrtPriceX96;
                const triggerAbove = Boolean(ord.triggerAbove);
                const expiry = Number(ord.expiry);
                const filled = Boolean(ord.filled);
                const cancelled = Boolean(ord.cancelled);

                // fetch decimals for tokenIn and tokenOut if not cached
                if (!(tokenIn.toLowerCase() in decimalsCache)) {
                    try {
                        const erc20 = new ethers.Contract(tokenIn, MIN_ERC20_ABI, provider);
                        const d = await erc20.decimals();
                        decimalsCache[tokenIn.toLowerCase()] = Number(d);
                    } catch (e) {
                        // fallback: assume 18
                        decimalsCache[tokenIn.toLowerCase()] = 18;
                    }
                }
                if (!(tokenOut.toLowerCase() in decimalsCache)) {
                    try {
                        const erc20 = new ethers.Contract(tokenOut, MIN_ERC20_ABI, provider);
                        const d = await erc20.decimals();
                        decimalsCache[tokenOut.toLowerCase()] = Number(d);
                    } catch (e) {
                        decimalsCache[tokenOut.toLowerCase()] = 18;
                    }
                }

                const decimalsIn = decimalsCache[tokenIn.toLowerCase()] ?? 18;
                const decimalsOut = decimalsCache[tokenOut.toLowerCase()] ?? 18;

                // format amounts for display
                let amountIn = "0";
                let minOut = "0";
                try {
                    amountIn = ethers.formatUnits(amountInRaw, decimalsIn);
                } catch (e) {
                    // fallback
                    amountIn = amountInRaw.toString();
                }
                try {
                    minOut = ethers.formatUnits(amountOutMinRaw, decimalsOut);
                } catch (e) {
                    minOut = amountOutMinRaw.toString();
                }

                const orderData = {
                    id,
                    maker,
                    tokenIn,
                    tokenOut,
                    poolFee,
                    pool,
                    amountIn,
                    minOut,
                    targetSqrt: targetSqrt?.toString?.() ?? String(targetSqrt),
                    triggerAbove,
                    expiry,
                    filled,
                    cancelled,
                };

                // classify
                const isExpired = expiry <= Math.floor(Date.now() / 1000);
                if (!filled && !cancelled && !isExpired) {
                    open.push(orderData);
                } else {
                    history.push(orderData);
                }
            }

            // sort newest first
            open.sort((a, b) => b.id - a.id);
            history.sort((a, b) => b.id - a.id);

            setOpenOrders(open);
            setOrderHistory(history);
        } catch (err: any) {
            console.error("Failed to fetch orders:", err?.message ?? err);
        } finally {
        }
    };

    // fetch on mount + poll every 15s
    useEffect(() => {
        fetchOrders();
        const t = setInterval(fetchOrders, 15000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- RENDER (UI unchanged) ----------
    return (
        <section
            className={`${className} w-full ${fullScreen ? " py-0" : " py-4"}`}
        >
            <div className={`w-full`}>
                <div className="flex flex-col lg:flex-row gap-3 h-auto lg:h-[55vh] lg:md:h-[62vh]">
                    {/* Trading Chart Section */}
                    <div className="modern-card w-full lg:w-[100%] overflow-hidden h-[50vh] lg:h-full">
                        <div className="relative w-full h-full overflow-hidden">
                            <div
                                ref={chartContainerRef}
                                className="TVChartContainer absolute top-0 left-0 w-full h-full"
                            />
                        </div>
                    </div>
                    {/* Orders Panel Section */}
                    {showOrders && (
                        <div className="modern-card w-full lg:w-[40%] flex flex-col h-[50vh] lg:h-full">
                            <div className="md:p-[20px] p-[16px] flex flex-col flex-1">
                                {/* Tab Navigation */}
                                <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-[8px] px-2 py-1.5 text-sm w-full flex items-center gap-1 mb-[20px]">
                                    <button
                                        className={`flex-1 px-[10px] py-[8px] rounded-[6px] cursor-pointer transition-colors font-medium ${activeTab === "open"
                                            ? "active-orders"
                                            : "text-[#888888] hover:text-[#333333]"
                                            }`}
                                        onClick={() => setActiveTab("open")}
                                    >
                                        Open Orders
                                    </button>
                                    <button
                                        className={`flex-1 px-[10px] py-[8px] rounded-[6px] cursor-pointer transition-colors font-medium ${activeTab === "history"
                                            ? "active-orders"
                                            : "text-[#888888] hover:text-[#333333]"
                                            }`}
                                        onClick={() => setActiveTab("history")}
                                    >
                                        Orders History
                                    </button>
                                </div>

                                {/* Orders Content */}
                                <div className="bg-[#F8F8F8] rounded-[8px] border border-[#E5E5E5] flex-1 p-4 overflow-y-auto max-h-[40vh] lg:max-h-[75vh]">
                                    {activeTab === "open" ? (
                                        openOrders.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full">
                                                <NoOrdersIcon />
                                                <h2 className="text-[#333333] text-xl font-semibold mt-[32px] text-center">
                                                    No Open Orders Yet
                                                </h2>
                                            </div>
                                        ) : (
                                            <ul className="space-y-3">
                                                {openOrders.map((o) => (
                                                    <li
                                                        key={o.id}
                                                        className="flex flex-col lg:flex-row lg:justify-between bg-white rounded-md p-3 shadow-sm gap-2"
                                                    >
                                                        <span className="text-sm font-medium">
                                                            #{o.id} {o.tokenIn.slice(0, 6)}… → {o.tokenOut.slice(0, 6)}…
                                                        </span>
                                                        <span className="text-sm">
                                                            {o.amountIn} in | min {o.minOut} out
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {o.triggerAbove ? "Above" : "Below"} •{" "}
                                                            {new Date(o.expiry * 1000).toLocaleString()}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )
                                    ) : orderHistory.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <NoOrdersIcon />
                                            <h2 className="text-[#333333] text-xl font-semibold mt-[32px] text-center">
                                                No Order History Yet
                                            </h2>
                                        </div>
                                    ) : (
                                        <ul className="space-y-3">
                                            {orderHistory.map((o) => (
                                                <li
                                                    key={o.id}
                                                    className="flex flex-col lg:flex-row lg:justify-between bg-white rounded-md p-3 shadow-sm gap-2"
                                                >
                                                    <span className="text-sm font-medium">
                                                        #{o.id} {o.tokenIn.slice(0, 6)}… → {o.tokenOut.slice(0, 6)}…
                                                    </span>
                                                    <span className="text-sm">{o.amountIn} in</span>
                                                    <span className="text-xs text-gray-500">
                                                        {o.filled ? "Filled" : o.cancelled ? "Cancelled" : "Expired"}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>


            </div>
        </section>
    );
};

export default TradingDashboard;