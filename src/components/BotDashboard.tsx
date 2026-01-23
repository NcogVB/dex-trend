import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../contexts/WalletContext";
import {
  Activity, BarChart3, TrendingUp, Zap, Settings, PlusCircle,
  Users, Wallet, Lock, ArrowUpRight, CheckCircle2, AlertCircle,
  Hash, Download, Skull, Percent
} from "lucide-react";
import DepthChart from "./DepthChart";
import { TOKENS } from "../utils/SwapTokens";
import TokenSelector from "./TokenSelector";
import { CORE_ADDR, FUTURES_ADDR, USDT_ADDR, OPTIONS_ADDR } from '../utils/Constants';
import { ERC20_ABI } from "../contexts/ABI";

const CORE_ABI = [
  "function owner() view returns (address)",
  "function isController(address) view returns (bool)",
  "function setAssetPrice(address token,address quote, uint256 price) external",
  "function addLiquidity(address token, uint256 amount) external",
  "function removeLiquidity(address token, uint256 amount) external",
  "function withdrawEarnings(address token) external",
  "function liquidityPool(address) view returns (uint256)",
  "function protocolPrincipal(address) view returns (uint256)",
  "function lockedBalances(address, address) view returns (uint256)",
  "event SpotTrade(address indexed tokenIn, address indexed tokenOut, uint256 price, uint256 amount, uint256 timestamp)"
];

const FUTURES_ABI = [
  "function getGlobalPositions(uint256, uint256) view returns (tuple(address user, address asset, uint256 sizeUSD, uint256 margin, uint256 entryPrice, bool isLong, bool active)[])",
  "function liquidatePosition(address user, address asset) external",
  "event PositionOpened(address indexed user, address indexed asset, bool isLong, uint256 size, uint256 price)",
];

const OPTIONS_ABI = [
  "function getActiveOptions(uint256, uint256) view returns (tuple(uint256 id, address holder, uint256 amount, uint256 strikePrice, uint256 premium, bool active)[])",
  "function currentPremiumBps() view returns (uint256)",
  "function setPremiumConfig(uint256) external",
  "event OptionBought(address indexed user, uint256 indexed id, bool isCall, uint256 strike, uint256 amount, uint256 premium)"
];

const AdminDashboard = () => {
  const { provider, account, signer } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);

  const [lpParams, setLpParams] = useState({
    token: TOKENS[0],
    amount: "",
    principal: 0,
    poolBalance: 0,
    earnings: 0,
    availableLiquidity: 0
  });

  const [optConfig, setOptConfig] = useState({
    currentBps: 0,
    newBps: ""
  });

  const [riskyPositions, setRiskyPositions] = useState<any[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [stats, setStats] = useState({
    tvl: "0",
    spotVolume: 0,
    futuresVolume: 0,
    optionsVolume: 0,
    totalVolume: 0,
    totalTx: 0,
    activeTraders: 0,
    controllers: { futures: false, options: false }
  });

  const fetchData = useCallback(async () => {
    if (!provider) return;

    try {
      const core = new ethers.Contract(CORE_ADDR, CORE_ABI, provider);
      const futures = new ethers.Contract(FUTURES_ADDR, FUTURES_ABI, provider);
      const options = new ethers.Contract(OPTIONS_ADDR, OPTIONS_ABI, provider);
      const owner = await core.owner();
      if (account && owner.toLowerCase() === account.toLowerCase()) setIsAdmin(true);

      const liquidityPoolWei = await core.liquidityPool(USDT_ADDR);
      const tvl = ethers.formatUnits(liquidityPoolWei, 18);

      const isFut = await core.isController(FUTURES_ADDR);
      const isOpt = await core.isController(OPTIONS_ADDR);

      const currentBlock = await provider.getBlockNumber();
      const fromBlock = currentBlock - 5000;

      const spotFilter = core.filters.SpotTrade();
      const spotLogs = await core.queryFilter(spotFilter, fromBlock, currentBlock);
      let spotVol = 0;
      spotLogs.forEach((log: any) => {
        const tokenIn = log.args[0];
        const price = parseFloat(ethers.formatUnits(log.args[2], 18));
        const amount = parseFloat(ethers.formatUnits(log.args[3], 18));

        if (tokenIn.toLowerCase() === USDT_ADDR.toLowerCase()) {
          spotVol += amount;
        } else {
          spotVol += amount * price;
        }
      });

      const openFilter = futures.filters.PositionOpened();
      const openLogs = await futures.queryFilter(openFilter, fromBlock, currentBlock);
      let futuresVol = 0;
      openLogs.forEach((log: any) => futuresVol += parseFloat(ethers.formatUnits(log.args[3], 18)));

      const optFilter = options.filters.OptionBought();
      const optLogs = await options.queryFilter(optFilter, fromBlock, currentBlock);
      let optVol = 0;
      optLogs.forEach((log: any) => { optVol += parseFloat(ethers.formatUnits(log.args[5], 18)); });

      const totalTxCount = spotLogs.length + openLogs.length + optLogs.length;

      const traders = new Set();
      [...spotLogs, ...openLogs, ...optLogs].forEach((log: any) => {
        if (log.args && log.args[0]) traders.add(log.args[0]);
      });

      setStats({
        tvl,
        spotVolume: spotVol,
        futuresVolume: futuresVol,
        optionsVolume: optVol,
        totalVolume: (spotVol + futuresVol + optVol),
        totalTx: totalTxCount,
        activeTraders: traders.size,
        controllers: { futures: isFut, options: isOpt }
      });

      try {
        const bps = await options.currentPremiumBps();
        setOptConfig(p => ({ ...p, currentBps: Number(bps) }));
      } catch { }

    } catch (e) { console.error(e); }
  }, [provider, account]);

  useEffect(() => {
    if (!provider || !lpParams.token) return;
    const fetchLpData = async () => {
      try {
        const core = new ethers.Contract(CORE_ADDR, CORE_ABI, provider);
        const decimals = 18;

        const poolWei = await core.liquidityPool(lpParams.token.address);
        const principalWei = await core.protocolPrincipal(lpParams.token.address);

        const pool = parseFloat(ethers.formatUnits(poolWei, decimals));
        const principal = parseFloat(ethers.formatUnits(principalWei, decimals));

        const earnings = Math.max(0, pool - principal);

        setLpParams(p => ({
          ...p,
          poolBalance: pool,
          principal: principal,
          earnings: earnings,
          availableLiquidity: pool
        }));
      } catch (e) { console.error("LP Fetch Error", e); }
    };
    fetchLpData();
    const i = setInterval(fetchLpData, 10000);
    return () => clearInterval(i);
  }, [provider, lpParams.token]);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 30000);
    return () => clearInterval(i);
  }, [fetchData]);

  const scanLiquidations = async () => {
    if (!provider) return;
    setLoadingAction('scan');
    try {
      const futures = new ethers.Contract(FUTURES_ADDR, FUTURES_ABI, provider);
      const core = new ethers.Contract(CORE_ADDR, CORE_ABI, provider);

      const positions = await futures.getGlobalPositions(0, 50);
      const risky = [];

      for (const p of positions) {
        if (!p.active) continue;

        const currentPriceWei = await core.getPrice(p.asset, USDT_ADDR);
        const currentPrice = parseFloat(ethers.formatUnits(currentPriceWei, 18));
        const entryPrice = parseFloat(ethers.formatUnits(p.entryPrice, 18));
        const size = parseFloat(ethers.formatUnits(p.sizeUSD, 18));
        const margin = parseFloat(ethers.formatUnits(p.margin, 18));

        let pnl = 0;
        if (p.isLong) pnl = ((currentPrice - entryPrice) * size) / entryPrice;
        else pnl = ((entryPrice - currentPrice) * size) / entryPrice;

        if (pnl < 0 && Math.abs(pnl) >= margin * 0.9) {
          risky.push({
            user: p.user,
            asset: p.asset,
            margin,
            pnl,
            canLiquidate: Math.abs(pnl) >= margin
          });
        }
      }
      setRiskyPositions(risky);
      if (risky.length === 0) alert("No liquidatable positions found.");
    } catch (e) { console.error(e); }
    finally { setLoadingAction(null); }
  };

  const executeLiquidation = async (user: string, asset: string) => {
    if (!signer) return;
    setLoadingAction(`liq-${user}`);
    try {
      const futures = new ethers.Contract(FUTURES_ADDR, FUTURES_ABI, signer);
      const tx = await futures.liquidatePosition(user, asset);
      await tx.wait();
      alert("Position Liquidated!");
      scanLiquidations();
    } catch (e: any) { alert("Failed: " + e.reason); }
    finally { setLoadingAction(null); }
  }

  const handleUpdateOptions = async () => {
    if (!signer || !optConfig.newBps) return;
    setLoadingAction('optUpdate');
    try {
      const options = new ethers.Contract(OPTIONS_ADDR, OPTIONS_ABI, signer);
      const tx = await options.setPremiumConfig(optConfig.newBps);
      await tx.wait();
      alert("Options Premium Updated!");
      setOptConfig(p => ({ ...p, currentBps: Number(p.newBps), newBps: "" }));
    } catch (e: any) { alert(e.reason || e.message); }
    finally { setLoadingAction(null); }
  }

  const handleAddLiquidity = async () => {
    if (!signer || !lpParams.amount) return;
    setLoadingAction('addLP');
    try {
      const core = new ethers.Contract(CORE_ADDR, CORE_ABI, signer);
      const token = new ethers.Contract(lpParams.token.address, ERC20_ABI, signer);
      const decimals = await token.decimals();
      const amountWei = ethers.parseUnits(lpParams.amount, decimals);

      const txApprove = await token.approve(CORE_ADDR, amountWei);
      await txApprove.wait();
      const txDeposit = await core.addLiquidity(lpParams.token.address, amountWei);
      await txDeposit.wait();

      alert(`Liquidity Added!`);
      setLpParams(p => ({ ...p, amount: '' }));
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setLoadingAction(null); }
  };

  const handleWithdrawEarnings = async () => {
    if (!signer) return;
    setLoadingAction('withdraw');
    try {
      const core = new ethers.Contract(CORE_ADDR, CORE_ABI, signer);
      const tx = await core.withdrawEarnings(lpParams.token.address);
      await tx.wait();
      alert("Earnings Withdrawn Successfully!");
    } catch (e: any) { alert("Error: " + (e.reason || e.message)); }
    finally { setLoadingAction(null); }
  };

  const handleRemovePrincipal = async () => {
    if (!signer || !lpParams.amount) return;
    setLoadingAction('removeLP');
    try {
      const core = new ethers.Contract(CORE_ADDR, CORE_ABI, signer);
      const token = new ethers.Contract(lpParams.token.address, ERC20_ABI, provider);
      const decimals = await token.decimals();
      const amountWei = ethers.parseUnits(lpParams.amount, decimals);

      const tx = await core.removeLiquidity(lpParams.token.address, amountWei);
      await tx.wait();
      alert("Principal Removed Successfully!");
      setLpParams(p => ({ ...p, amount: '' }));
    } catch (e: any) { alert("Error: " + (e.reason || e.message)); }
    finally { setLoadingAction(null); }
  };

  const formatCurrency = (val: number | string) => {
    return parseFloat(val.toString()).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  if (!provider) return <div className="p-10 text-center animate-pulse text-gray-500">Connecting to Blockchain...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50/50 min-h-screen font-sans text-slate-800">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="text-indigo-600 w-6 h-6" /> Executive Dashboard
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-1 uppercase tracking-wider">Protocol Analytics & Administration</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> System Online
          </div>
          {isAdmin && <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-sm">Admin Access</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Available Liquidity</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{formatCurrency(stats.tvl)}</h2>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg"><Lock className="w-5 h-5 text-indigo-600" /></div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full w-[75%]"></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Excludes funds locked in orders</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">24h Volume</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{formatCurrency(stats.totalVolume)}</h2>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><Activity className="w-5 h-5 text-blue-600" /></div>
          </div>
          <div className="flex gap-1 mt-2">
            <span className="text-xs font-bold text-green-600 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +12.5%</span>
            <span className="text-xs text-slate-400">vs yesterday</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Transactions</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{stats.totalTx}</h2>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg"><Hash className="w-5 h-5 text-orange-600" /></div>
          </div>
          <div className="flex gap-1 mt-2">
            <span className="text-xs text-slate-400">Executions across all markets</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Traders</p>
              <h2 className="text-3xl font-black text-purple-600 mt-1">{stats.activeTraders}</h2>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg"><Users className="w-5 h-5 text-purple-600" /></div>
          </div>
          <div className="flex -space-x-2 overflow-hidden mt-1">
            {[1, 2, 3, 4].map(i => <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200"></div>)}
            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 border border-slate-200">+{stats.activeTraders}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-6">
              <Zap className="w-4 h-4 text-orange-500" /> Volume Composition
            </h3>

            <div className="flex h-4 w-full rounded-full overflow-hidden mb-4 bg-slate-100">
              <div style={{ width: `${(stats.spotVolume / stats.totalVolume * 100) || 0}%` }} className="bg-blue-500 h-full" title="Spot"></div>
              <div style={{ width: `${(stats.futuresVolume / stats.totalVolume * 100) || 0}%` }} className="bg-purple-500 h-full" title="Futures"></div>
              <div style={{ width: `${(stats.optionsVolume / stats.totalVolume * 100) || 0}%` }} className="bg-green-500 h-full" title="Options"></div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-bold text-slate-600">Spot Market</span>
                </div>
                <span className="text-sm font-mono font-bold text-slate-800">{formatCurrency(stats.spotVolume)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-xs font-bold text-slate-600">Futures Leverage</span>
                </div>
                <span className="text-sm font-mono font-bold text-slate-800">{formatCurrency(stats.futuresVolume)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs font-bold text-slate-600">Options Prem.</span>
                </div>
                <span className="text-sm font-mono font-bold text-slate-800">{formatCurrency(stats.optionsVolume)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Network Status</h4>
            <div className="flex gap-4">
              <div className={`flex items-center gap-1.5 text-xs font-medium ${stats.controllers.futures ? 'text-green-600' : 'text-red-500'}`}>
                {stats.controllers.futures ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} Futures
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${stats.controllers.options ? 'text-green-600' : 'text-red-500'}`}>
                {stats.controllers.options ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} Options
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <DepthChart />
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-indigo-100 mb-20 relative z-10">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" /> Administrative Controls
            </h3>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">CORE: {CORE_ADDR.slice(0, 6)}...{CORE_ADDR.slice(-4)}</span>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-green-500" /> Liquidity Manager</h4>
                <div className="flex gap-2">
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md font-medium">Principal: {formatCurrency(lpParams.principal)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-green-100 mb-4 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Earnings</span>
                    <span className="text-xl font-bold text-green-600">{formatCurrency(lpParams.earnings)}</span>
                  </div>
                  <button onClick={handleWithdrawEarnings} disabled={loadingAction === 'withdraw' || lpParams.earnings <= 0} className="bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50">
                    {loadingAction === 'withdraw' ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-green-700 border-t-transparent"></div> : <Download className="w-3 h-3" />} Claim
                  </button>
                </div>

                <div className="flex gap-2 mb-3 items-end">
                  <div className="w-3/5 relative z-40">
                    <TokenSelector tokens={TOKENS} selected={lpParams.token} onSelect={(t: any) => setLpParams(p => ({ ...p, token: t }))} label="Asset" />
                  </div>
                  <div className="w-full">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount</label>
                    <input type="number" placeholder="0.00" value={lpParams.amount} onChange={(e) => setLpParams(p => ({ ...p, amount: e.target.value }))} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleAddLiquidity} disabled={loadingAction === 'addLP'} className="w-full text-white bg-slate-800 hover:bg-slate-900 font-bold rounded-lg text-sm py-2.5 transition-all shadow-md shadow-slate-200 flex items-center justify-center gap-2">
                    {loadingAction === 'addLP' ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <><PlusCircle className="w-4 h-4" /> Add LP</>}
                  </button>
                  <button onClick={handleRemovePrincipal} disabled={loadingAction === 'removeLP'} className="w-full text-red-600 bg-white border border-red-200 hover:bg-red-50 font-bold rounded-lg text-sm py-2.5 transition-all flex items-center justify-center gap-2">
                    {loadingAction === 'removeLP' ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div> : <><ArrowUpRight className="w-4 h-4" /> Remove LP</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:pl-8 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Percent className="w-4 h-4 text-blue-500" /> Options Config</h4>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium">Current: {optConfig.currentBps / 100}%</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] text-slate-500 mb-3">Set base premium rate in Basis Points (100 = 1%). Min 1%, Max 50%.</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={optConfig.newBps}
                    onChange={(e) => setOptConfig(p => ({ ...p, newBps: e.target.value }))}
                    placeholder="e.g. 2000"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold"
                  />
                  <button onClick={handleUpdateOptions} disabled={loadingAction === 'optUpdate'} className="bg-blue-600 text-white px-4 rounded-lg font-bold text-xs hover:bg-blue-700 flex items-center gap-1">
                    {loadingAction === 'optUpdate' ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div> : "Update"}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:pl-8 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Skull className="w-4 h-4 text-red-500" /> Liquidation Scanner</h4>
                <button onClick={scanLiquidations} disabled={loadingAction === 'scan'} className="text-[10px] text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md font-bold transition flex items-center gap-1">
                  {loadingAction === 'scan' ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div> : "Scan Now"}
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[150px] max-h-[250px] overflow-y-auto">
                {riskyPositions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                    <CheckCircle2 className="w-6 h-6 mb-1 text-green-400" />
                    <span>System Healthy. No insolvencies.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {riskyPositions.map((p, i) => (
                      <div key={i} className="bg-white p-2 rounded border border-red-100 flex justify-between items-center shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-slate-600">{p.user.slice(0, 6)}...</span>
                          <span className="text-[10px] font-bold text-red-600">PnL: {p.pnl.toFixed(2)}</span>
                        </div>
                        {p.canLiquidate ? (
                          <button
                            onClick={() => executeLiquidation(p.user, p.asset)}
                            disabled={loadingAction === `liq-${p.user}`}
                            className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-red-700 flex items-center gap-1"
                          >
                            {loadingAction === `liq-${p.user}` ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div> : "LIQUIDATE"}
                          </button>
                        ) : (
                          <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-1 rounded font-bold">At Risk</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;