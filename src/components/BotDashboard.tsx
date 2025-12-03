import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://api.dex-trend.com/stats";

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
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get(API_URL);
      setLiquidity(res.data.liquidity || {});
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

  if (loading)
    return (
      <div className="p-8 text-gray-500 text-center animate-pulse text-lg bg-gray-100 h-screen">
        Loading liquidity data...
      </div>
    );

  const pairs = Object.keys(liquidity);

  if (pairs.length === 0)
    return (
      <div className="p-8 text-gray-600 text-center bg-gray-100 h-screen">
        No liquidity data available.
      </div>
    );

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-100 min-h-screen text-gray-800">
      <h2 className="text-2xl font-semibold text-red-600 mb-6">
        Orderbook AMM Dashboard
      </h2>

      <div className="overflow-x-auto rounded-lg shadow bg-white border border-gray-200">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gray-200 border-b border-gray-300">
            <tr>
              {["Pair", "Buy Liquidity", "Sell Liquidity", "Total Liquidity", "Orders", "Spread"].map(
                (title) => (
                  <th key={title} className="p-3 font-semibold text-center">
                    {title}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {pairs.map((pair, idx) => {
              const lp = liquidity[pair];
              return (
                <tr
                  key={pair}
                  className={`text-center ${
                    idx % 2 === 0 ? "bg-gray-50" : "bg-gray-100"
                  } hover:bg-red-50 transition`}
                >
                  <td className="p-3 font-medium text-red-600 break-all">{pair}</td>

                  <td className="p-3 text-green-600 font-medium">
                    {Number(lp.buyLiquidity).toFixed(6)}
                  </td>

                  <td className="p-3 text-red-500 font-medium">
                    {Number(lp.sellLiquidity).toFixed(6)}
                  </td>

                  <td className="p-3 text-blue-700 font-semibold">
                    {Number(lp.totalLiquidity).toFixed(6)}
                  </td>

                  <td className="p-3">
                    <div className="text-green-700">{lp.buyOrders} buys</div>
                    <div className="text-red-700">{lp.sellOrders} sells</div>
                    <div className="text-xs text-gray-500">{lp.totalOrders} total</div>
                  </td>

                  <td className="p-3 font-semibold text-gray-700">{lp.spread}</td>
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
