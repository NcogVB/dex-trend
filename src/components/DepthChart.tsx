import { useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Loader2, RefreshCw, AlertCircle, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { TOKENS } from '../utils/SwapTokens';

const CORE_ADDR = "0x2D2d50590B7900F1023B7A745EBc368c9C3D97A0";
const USDT_ADDR = "0x0F7782ef1Bd024E75a47d344496022563F0C1A38";

const CORE_ABI = [
    "function orderBook(address, address, uint256) view returns (uint256)",
    "function orders(uint256) view returns (tuple(uint256 id, address maker, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint256 targetPrice, uint256 expiry, bool filled, bool cancelled, bool isBuy))"
];

const ERC20_ABI = ["function decimals() view returns (uint8)"];

const DepthChart = ({ initialToken }: { initialToken?: any }) => {
    const { provider } = useWallet();
    const [baseToken, setBaseToken] = useState(initialToken || TOKENS[1]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [midPrice, setMidPrice] = useState<number>(0);
    const [zoom, setZoom] = useState<number>(0.1);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchOrderBook = async () => {
        if (!provider || !baseToken) return;
        setLoading(true);

        try {
            const core = new ethers.Contract(CORE_ADDR, CORE_ABI, provider);

            let baseDecimals = 18;
            try {
                const tokenContract = new ethers.Contract(baseToken.address, ERC20_ABI, provider);
                baseDecimals = await tokenContract.decimals();
            } catch (err) { }

            const askPoints = [];
            for (let i = 0; i < 50; i++) {
                try {
                    const id = await core.orderBook(baseToken.address, USDT_ADDR, i);
                    const o = await core.orders(id);
                    if (!o.filled && !o.cancelled) {
                        const price = parseFloat(ethers.formatUnits(o.targetPrice, 18));
                        const amount = parseFloat(ethers.formatUnits(o.amountIn, baseDecimals));
                        askPoints.push({ price, amount });
                    }
                } catch (e) { break; }
            }

            const bidPoints = [];
            for (let i = 0; i < 50; i++) {
                try {
                    const id = await core.orderBook(USDT_ADDR, baseToken.address, i);
                    const o = await core.orders(id);
                    if (!o.filled && !o.cancelled) {
                        const price = parseFloat(ethers.formatUnits(o.targetPrice, 18));
                        const usdtAmount = parseFloat(ethers.formatUnits(o.amountIn, 18));
                        const size = price > 0 ? usdtAmount / price : 0;
                        bidPoints.push({ price, amount: size });
                    }
                } catch (e) { break; }
            }

            bidPoints.sort((a, b) => b.price - a.price);
            askPoints.sort((a, b) => a.price - b.price);

            let cumBid = 0;
            const processedBids = bidPoints.map(o => {
                cumBid += o.amount;
                return { price: o.price, bidVolume: cumBid, askVolume: null };
            }).sort((a, b) => a.price - b.price);

            let cumAsk = 0;
            const processedAsks = askPoints.map(o => {
                cumAsk += o.amount;
                return { price: o.price, bidVolume: null, askVolume: cumAsk };
            });

            let calculatedMid = 0;
            if (bidPoints.length > 0 && askPoints.length > 0) {
                calculatedMid = (bidPoints[0].price + askPoints[0].price) / 2;
            } else if (bidPoints.length > 0) {
                calculatedMid = bidPoints[0].price;
            } else if (askPoints.length > 0) {
                calculatedMid = askPoints[0].price;
            }
            setMidPrice(calculatedMid);

            setChartData([...processedBids, ...processedAsks]);

        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchOrderBook();
        const i = setInterval(fetchOrderBook, 15000);
        return () => clearInterval(i);
    }, [baseToken, provider]);

    const getDomain = () => {
        if (chartData.length === 0) return ['auto', 'auto'];

        const prices = chartData.map(d => d.price);
        let min = Math.min(...prices);
        let max = Math.max(...prices);

        if (min === max) {
            min = min * 0.95;
            max = max * 1.05;
        } else {
            const spread = max - min;
            const padding = spread * zoom;
            min = Math.max(0, min - padding);
            max = max + padding;
        }

        if (midPrice > 0 && (max - min) < midPrice * 0.02) {
            min = midPrice * 0.98;
            max = midPrice * 1.02;
        }

        return [min, max];
    };

    const handleZoom = (direction: 'in' | 'out') => {
        setZoom(prev => {
            if (direction === 'in') return Math.max(0.01, prev - 0.05);
            return Math.min(2.0, prev + 0.05);
        });
    };

    if (loading && chartData.length === 0) return <div className="h-[400px] flex items-center justify-center bg-[#101014] rounded-xl border border-gray-800"><Loader2 className="animate-spin text-gray-500 mr-2" /></div>;

    return (
        <div className="w-full h-[400px] bg-[#101014] p-4 rounded-xl shadow-xl border border-gray-800 relative flex flex-col">

            <div className="flex justify-between items-center mb-4 z-20">
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 bg-[#1E2329] hover:bg-[#2B2F36] text-white px-3 py-1.5 rounded-lg border border-gray-700 transition-colors"
                    >
                        {baseToken.img && <img src={baseToken.img} className="w-5 h-5 rounded-full" alt="" />}
                        <span className="font-bold text-sm">{baseToken.symbol} / USDT</span>
                        {isDropdownOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-[#1E2329] border border-gray-700 rounded-lg shadow-2xl overflow-hidden py-1">
                            {TOKENS.filter(t => t.symbol !== "USDT").map(t => (
                                <div
                                    key={t.symbol}
                                    onClick={() => { setBaseToken(t); setIsDropdownOpen(false); }}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#2B2F36] cursor-pointer"
                                >
                                    <img src={t.img} className="w-5 h-5 rounded-full" />
                                    <span className="text-gray-200 text-sm font-medium">{t.symbol}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-[#1E2329] rounded-lg border border-gray-700 p-0.5">
                        <button onClick={() => handleZoom('out')} className="p-1.5 hover:bg-[#2B2F36] rounded text-gray-400 transition"><Minus className="w-3 h-3" /></button>
                        <button onClick={() => handleZoom('in')} className="p-1.5 hover:bg-[#2B2F36] rounded text-gray-400 transition"><Plus className="w-3 h-3" /></button>
                    </div>
                    <button onClick={fetchOrderBook} className="p-2 bg-[#1E2329] hover:bg-[#2B2F36] rounded-lg border border-gray-700 text-gray-400 transition"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium">No Open Orders</p>
                </div>
            ) : (
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="fillBid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ECB81" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#0ECB81" stopOpacity={0.05} />
                                </linearGradient>
                                <linearGradient id="fillAsk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F6465D" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#F6465D" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2B2F36" />
                            <XAxis
                                dataKey="price"
                                type="number"
                                domain={getDomain()}
                                tick={{ fontSize: 10, fill: '#848E9C' }}
                                tickFormatter={(val) => val.toFixed(4)}
                                axisLine={false}
                                tickLine={false}
                                allowDataOverflow={true}
                            />
                            <YAxis
                                orientation="right"
                                tick={{ fontSize: 10, fill: '#848E9C' }}
                                axisLine={false}
                                tickLine={false}
                                width={40}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1E2329', borderRadius: '4px', border: '1px solid #2B2F36', fontSize: '12px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(val: any, name?: string) => [
                                    <span key="val" style={{ color: name === 'bidVolume' ? '#0ECB81' : '#F6465D' }}>{val.toFixed(4)}</span>,
                                    name === 'bidVolume' ? 'Buy Vol' : 'Sell Vol'
                                ]}
                                labelFormatter={(label) => `Price: ${parseFloat(label).toFixed(4)}`}
                            />
                            <Area
                                type="stepAfter"
                                dataKey="bidVolume"
                                stroke="#0ECB81"
                                fill="url(#fillBid)"
                                strokeWidth={2}
                                connectNulls
                                isAnimationActive={true}
                                animationDuration={500}
                            />
                            <Area
                                type="stepBefore"
                                dataKey="askVolume"
                                stroke="#F6465D"
                                fill="url(#fillAsk)"
                                strokeWidth={2}
                                connectNulls
                                isAnimationActive={true}
                                animationDuration={500}
                            />
                            {midPrice > 0 && (
                                <ReferenceLine x={midPrice} stroke="#5E6673" strokeDasharray="3 3" />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="absolute bottom-2 left-4 z-10 pointer-events-none">
                {midPrice > 0 && <span className="text-xl font-bold text-white tracking-tight">${midPrice.toFixed(4)}</span>}
            </div>
        </div>
    );
};

export default DepthChart;