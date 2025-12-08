import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://api.dex-trend.com/stats";

const TOKEN_MAP: { [symbol: string]: string } = {
  USDT: "0x61958f3db9db9bed7beefb3def3470f0f07629bb",
  HBAR: "0xfbce373dc5201916cfaf627f4fcc307b9010d3e0",
  BTC: "0x2bf5f367b1559a93f1faf4a194478e707738f6bd",
  TON: "0xb4753c1edde1d79ec36363f116d2e7df4dec0402",
  LINK: "0x0703f58602ab1a8a84c1812486a8b4cf07c5a5da",
  LDO: "0x944c1ffd41bf305b4dcc37f7d1648829b41f4758",
  GALA: "0xdecfe53d2998f954709b144e846814d40ad8e9f2",
  MATIC: "0x1f35acd37d2fe4c533c1774a76f0b7dcba76d609",
  ENA: "0x0133394e4a539f81ec51b81de77f1bebf6497946",
  DOT: "0xcbc7be8802e930ddc8bdf08e3bcdbd58e30b5d44",
  SOL: "0x818fe6cc6f48e4379b89f449483a8eedea330425",
  LEO: "0x54b037ac3b58c221e86b4f3ded5922f7cd084769",
  DOGE: "0xb4306eceb7bb2a363f8344575fc75ab388206a01",
  TRX: "0xc38c3a89460d6c57fd5f77b00c854bf7d3686c8d",
  ADA: "0x9181f63e1092b65b0c6271f0d649eb1183dfd2b6",
  HYPE: "0x96a95f5a25a6b3d0658e261e69965dd9e4b0789f",
  USDE: "0x606e4b1b1405fe226c7ddc491b85ad5003717e08",
  AVAX: "0xbd2ae006376bd45432153c0c08189dac2706aadf",
  XLM: "0x111915a20361a2c46a508c53af5dea1ed01dc0f2",
  SUI: "0x628badb5e5cc743e710dc5161ba9614fe360abe2",
  ETH: "0xb077f3e3fc7a102bae0d77930108c4b15e280054",
  USDC: "0x0A7d0AA33FD217A8b7818A6da40b45603C4c367E", 
  BNB: "0xb4753c1EDDE1D79ec36363F116D2E7DF4dec0402", 
};

interface LiquidityEntry {
  buyLiquidity: string;
  sellLiquidity: string;
  totalLiquidity: string;
  buyOrders: number;
  sellOrders: number;
  totalOrders: number;
  spread: string;
}

const LiquidityDashboard: React.FC = () => {
  const [liquidity, setLiquidity] = useState<{ [pair: string]: LiquidityEntry }>({});
  const [volume24h, setVolume24h] = useState<{ [pair: string]: string }>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get(API_URL);
      setLiquidity(res.data.liquidity || {});
      setVolume24h(res.data.volume24h || {});
    } catch (err) {
      console.error("Failed to fetch /stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getVolumeForPair = (pair: string) => {
    const [baseSym, quoteSym] = pair.split("/");

    const baseAddr = TOKEN_MAP[baseSym]?.toLowerCase();
    const quoteAddr = TOKEN_MAP[quoteSym]?.toLowerCase();

    if (!baseAddr || !quoteAddr) return "0.0000";

    const key1 = `${baseAddr}-${quoteAddr}`;
    const key2 = `${quoteAddr}-${baseAddr}`;

    if (volume24h[key1]) return Number(volume24h[key1]).toFixed(4);
    if (volume24h[key2]) return Number(volume24h[key2]).toFixed(4);

    return "0.0000";
  };

  if (loading)
    return (
      <div className="p-8 text-gray-500 text-center animate-pulse text-lg bg-gray-100 h-screen">
        Loading dashboard...
      </div>
    );

  const pairs = Object.keys(liquidity);

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-100 min-h-screen text-gray-800">
      <h2 className="text-2xl font-semibold text-red-600 mb-6">
        Orderbook AMM Dashboard
      </h2>

      <div className="overflow-x-auto rounded-lg shadow bg-white border border-gray-200">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-200 border-b border-gray-300">
            <tr>
              {["Pair", "Buy Liquidity", "Sell Liquidity", "Total Liquidity", "Orders", "24h Volume"].map((title) => (
                <th key={title} className="p-3 font-semibold text-center">
                  {title}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pairs.map((pair, idx) => {
              const lp = liquidity[pair];
              const vol = getVolumeForPair(pair);

              return (
                <tr
                  key={pair}
                  className={`text-center ${idx % 2 === 0 ? "bg-gray-50" : "bg-gray-100"} hover:bg-red-50 transition`}
                >
                  <td className="p-3 font-medium text-red-600">{pair}</td>
                  <td className="p-3 text-green-600 font-medium">{Number(lp.buyLiquidity).toFixed(6)}</td>
                  <td className="p-3 text-red-500 font-medium">{Number(lp.sellLiquidity).toFixed(6)}</td>
                  <td className="p-3 text-blue-700 font-semibold">{Number(lp.totalLiquidity).toFixed(6)}</td>
                  <td className="p-3">
                    <div className="text-green-700">{lp.buyOrders} buys</div>
                    <div className="text-red-700">{lp.sellOrders} sells</div>
                  </td>
                  <td className="p-3 font-semibold text-purple-700">{vol}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiquidityDashboard;