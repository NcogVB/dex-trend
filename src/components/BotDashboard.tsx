import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import { Activity, BarChart3, TrendingUp, Zap, Settings, PlusCircle, DollarSign } from "lucide-react";
import DepthChart from "./DepthChart";
import { TOKENS } from "../utils/SwapTokens"; // Ensure this path is correct
import TokenSelector from "./TokenSelector";

const CORE_ADDR = "0x2D2d50590B7900F1023B7A745EBc368c9C3D97A0";
const FUTURES_ADDR = "0xD58e863bf16F6EbAeb322B5E53BDa749f4e4dF96";
const OPTIONS_ADDR = "0xA83b24B82AC1241d5ae5ed7a32E90f3FaA3728B4";
const USDT_ADDR = "0x0F7782ef1Bd024E75a47d344496022563F0C1A38";

const CORE_ABI = [
  "function owner() view returns (address)",
  "function isController(address) view returns (bool)",
  "function getPrice(address) view returns (uint256)",
  "function setAssetPrice(address token, uint256 price) external",
  "function addLiquidity(address token, uint256 amount) external",
  "event SpotTrade(address indexed tokenIn, address indexed tokenOut, uint256 price, uint256 amount)"
];

const FUTURES_ABI = [
  "function getGlobalPositions(uint256, uint256) view returns (tuple(address user, address asset, uint256 sizeUSD, uint256 entryPrice, bool isLong)[])",
  "event PositionOpened(address indexed user, address indexed asset, bool isLong, uint256 size, uint256 price)",
];

const OPTIONS_ABI = [
  "function getActiveOptions(uint256, uint256) view returns (tuple(uint256 id, address holder, uint256 amount, uint256 strikePrice, uint256 premium, bool active)[])",
  "event OptionBought(address indexed user, uint256 indexed id, bool isCall, uint256 strike, uint256 amount, uint256 premium)"
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function decimals() view returns (uint8)"
];

const AdminDashboard = () => {
  const { provider, account, signer } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin Action States
  const [priceParams, setPriceParams] = useState({ token: TOKENS[1], price: "" });
  const [lpParams, setLpParams] = useState({ token: TOKENS[0], amount: "" });
  const [loadingAction, setLoadingAction] = useState(false);

  const [stats, setStats] = useState({
    tvl: "0",
    spotVolume: "0",
    futuresVolume: "0",
    optionsVolume: "0",
    totalVolume: "0",
    activeTraders: 0,
    controllers: { futures: false, options: false }
  });

  const fetchData = useCallback(async () => {
    if (!provider) return;

    try {
      const core = new ethers.Contract(CORE_ADDR, CORE_ABI, provider);
      const futures = new ethers.Contract(FUTURES_ADDR, FUTURES_ABI, provider);
      const options = new ethers.Contract(OPTIONS_ADDR, OPTIONS_ABI, provider);
      const usdt = new ethers.Contract(USDT_ADDR, ERC20_ABI, provider);

      const owner = await core.owner();
      if (account && owner.toLowerCase() === account.toLowerCase()) setIsAdmin(true);

      const balanceRaw = await usdt.balanceOf(CORE_ADDR);
      const tvl = ethers.formatUnits(balanceRaw, 18);

      const isFut = await core.isController(FUTURES_ADDR);
      const isOpt = await core.isController(OPTIONS_ADDR);

      const currentBlock = await provider.getBlockNumber();
      const fromBlock = currentBlock - 2000;

      const spotFilter = core.filters.SpotTrade();
      const spotLogs = await core.queryFilter(spotFilter, fromBlock, currentBlock);
      let spotVol = 0;
      spotLogs.forEach((log: any) => {
        spotVol += parseFloat(ethers.formatUnits(log.args[3], 18));
      });

      const openFilter = futures.filters.PositionOpened();
      const openLogs = await futures.queryFilter(openFilter, fromBlock, currentBlock);
      let futuresVol = 0;
      openLogs.forEach((log: any) => futuresVol += parseFloat(ethers.formatUnits(log.args[3], 18)));

      const optFilter = options.filters.OptionBought();
      const optLogs = await options.queryFilter(optFilter, fromBlock, currentBlock);
      let optVol = 0;
      optLogs.forEach((log: any) => {
        optVol += parseFloat(ethers.formatUnits(log.args[5], 18));
      });

      const traders = new Set();
      [...spotLogs, ...openLogs, ...optLogs].forEach((log: any) => {
        if (log.args && log.args[0]) traders.add(log.args[0]);
      });

      setStats({
        tvl,
        spotVolume: spotVol.toFixed(2),
        futuresVolume: futuresVol.toFixed(2),
        optionsVolume: optVol.toFixed(2),
        totalVolume: (spotVol + futuresVol + optVol).toFixed(2),
        activeTraders: traders.size,
        controllers: { futures: isFut, options: isOpt }
      });

    } catch (e) { console.error(e); }
  }, [provider, account]);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 30000);
    return () => clearInterval(i);
  }, [fetchData]);

  // --- ACTIONS ---

  const handleSetPrice = async () => {
    if (!signer || !priceParams.price) return;
    setLoadingAction(true);
    try {
      const core = new ethers.Contract(CORE_ADDR, CORE_ABI, signer);
      // FIXED: using setAssetPrice instead of setLivePrice
      const priceWei = ethers.parseUnits(priceParams.price, 18);

      console.log(`Setting price for ${priceParams.token.address} to ${priceWei}`);

      const tx = await core.setAssetPrice(priceParams.token.address, priceWei);
      await tx.wait();

      alert(`Price for ${priceParams.token.symbol} updated to $${priceParams.price}`);
    } catch (e: any) {
      console.error(e);
      alert("Error setting price: " + (e.reason || e.message));
    } finally { setLoadingAction(false); }
  };

  const handleAddLiquidity = async () => {
    if (!signer || !lpParams.amount) return;
    setLoadingAction(true);
    try {
      const core = new ethers.Contract(CORE_ADDR, CORE_ABI, signer);
      const token = new ethers.Contract(lpParams.token.address, ERC20_ABI, signer);

      const decimals = await token.decimals();
      const amountWei = ethers.parseUnits(lpParams.amount, decimals);

      // 1. Approve
      const txApprove = await token.approve(CORE_ADDR, amountWei);
      await txApprove.wait();

      // 2. Deposit
      const txDeposit = await core.addLiquidity(lpParams.token.address, amountWei);
      await txDeposit.wait();

      alert(`Successfully added ${lpParams.amount} ${lpParams.token.symbol} to Liquidity Pool`);
      fetchData(); // Refresh TVL
    } catch (e: any) {
      alert("Error adding liquidity: " + e.message);
    } finally { setLoadingAction(false); }
  };

  if (!provider) return <div className="p-10 text-center animate-pulse">Connecting to Blockchain...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-indigo-600 w-8 h-8" /> EXCHANGE ANALYTICS
          </h1>
          <p className="text-gray-500 text-sm mt-1">Real-time On-Chain Volume & Liquidity</p>
        </div>
        {isAdmin && (
          <div className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-200">
            ADMIN MODE ACTIVE
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* STAT CARDS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-16 h-16 text-blue-600" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Volume</p>
          <h2 className="text-3xl font-black text-gray-800">${parseFloat(stats.totalVolume).toLocaleString()}</h2>
          <div className="mt-2 text-xs text-green-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +{stats.activeTraders} Active Traders
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Value Locked</p>
          <h2 className="text-3xl font-black text-gray-800">${parseFloat(stats.tvl).toLocaleString()}</h2>
          <div className="w-full bg-gray-100 h-1.5 mt-4 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full w-[60%]"></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Protocol Fees</p>
          <h2 className="text-3xl font-black text-green-600">
            ${(parseFloat(stats.totalVolume) * 0.001).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-gray-400 mt-1">Est. 0.1% Revenue</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Unique Users</p>
          <h2 className="text-3xl font-black text-purple-600">{stats.activeTraders}</h2>
          <p className="text-xs text-gray-400 mt-1">Recent Activity</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" /> Live Market Depth
          </h3>
        </div>
        <DepthChart />
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-orange-500" /> Volume Source Breakdown</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">Spot Market</span>
            <span className="text-2xl font-bold text-gray-800">${parseFloat(stats.spotVolume).toLocaleString()}</span>
          </div>
          <div className="h-10 w-1 bg-blue-500 rounded-full"></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">Futures Leverage</span>
            <span className="text-2xl font-bold text-gray-800">${parseFloat(stats.futuresVolume).toLocaleString()}</span>
          </div>
          <div className="h-10 w-1 bg-purple-500 rounded-full"></div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase">Options Premiums</span>
            <span className="text-2xl font-bold text-gray-800">${parseFloat(stats.optionsVolume).toLocaleString()}</span>
          </div>
          <div className="h-10 w-1 bg-green-500 rounded-full"></div>
        </div>
      </div>

      {/* NEW ADMIN CONTROLS SECTION */}
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-indigo-100 mb-8 z-10 relative">
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 font-bold text-indigo-800 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Admin Controls
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* 1. SET PRICE */}
            <div>
              <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Set Oracle Price</h4>
              <p className="text-xs text-gray-500 mb-4">Manually update the price for Futures & Options calculations.</p>

              <div className="flex gap-2 mb-3 items-end">
                <div className="w-2/3 relative z-50"> {/* Added z-50 for dropdown layering */}
                  <TokenSelector
                    tokens={TOKENS.filter(t => t.symbol !== "USDT")}
                    selected={priceParams.token}
                    onSelect={(t: any) => setPriceParams(p => ({ ...p, token: t }))}
                    label="Select Asset"
                  />
                </div>
                <div className="w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">New Price ($)</label>
                  <input
                    type="number"
                    placeholder="3000.00"
                    value={priceParams.price}
                    onChange={(e) => setPriceParams(p => ({ ...p, price: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleSetPrice}
                disabled={loadingAction}
                className="w-full mt-2 text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-bold rounded-xl text-sm px-5 py-3 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
              >
                {loadingAction ? "Updating Network..." : "Update Live Price"}
              </button>
            </div>

            {/* 2. ADD LIQUIDITY */}
            <div className="border-l border-gray-100 md:pl-8">
              <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Add Protocol Liquidity</h4>
              <p className="text-xs text-gray-500 mb-4">Deposit tokens into the Core Pool to pay out trading profits.</p>

              <div className="flex gap-2 mb-3 items-end">
                <div className="w-2/3 relative z-40"> {/* z-40 so it doesn't overlap left dropdown if opened */}
                  <TokenSelector
                    tokens={TOKENS}
                    selected={lpParams.token}
                    onSelect={(t: any) => setLpParams(p => ({ ...p, token: t }))}
                    label="Deposit Token"
                  />
                </div>
                <div className="w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Amount</label>
                  <input
                    type="number"
                    placeholder="1000.00"
                    value={lpParams.amount}
                    onChange={(e) => setLpParams(p => ({ ...p, amount: e.target.value }))}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-green-500 focus:border-green-500 shadow-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleAddLiquidity}
                disabled={loadingAction}
                className="w-full mt-2 text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-bold rounded-xl text-sm px-5 py-3 shadow-lg shadow-green-200 transition-all disabled:opacity-50"
              >
                {loadingAction ? "Processing Transaction..." : "Add Liquidity"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;