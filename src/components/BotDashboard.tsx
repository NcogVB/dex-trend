import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";

interface AmmPair {
  pair: string;
  poolAddress: string;
  price: string;
  range: string;
  tick: number;
  fee: number;
  liquidity: string;
  tokenReserves: {
    token0: string;
    token1: string;
  };
  totalValueETH: string;
  status: string;
}

interface BotState {
  lastRun: string;
  nextRun: string;
  pairs: AmmPair[];
}

const API_URL = "https://api.dex-trend.com/amm/status";

const AmmDashboard: React.FC = () => {
  const [data, setData] = useState<BotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const response = await axios.get(API_URL);
      setData(response.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("❌ Failed to fetch AMM status:", err);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(() => fetchStatus(false), 60_000); // every 1 min
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading)
    return (
      <div className="p-8 text-gray-500 text-center text-lg animate-pulse">
        ⏳ Loading AMM bot data...
      </div>
    );

  if (!data)
    return (
      <div className="p-8 text-gray-600 text-center">
        No AMM data available.
      </div>
    );

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen transition-all">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-blue-700">
          🤖 AMM Bot Dashboard
        </h2>
        <div className="text-sm text-gray-600 flex items-center gap-3">
          <span>
            Last updated:{" "}
            {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
          </span>
          {refreshing && (
            <span className="text-blue-500 animate-pulse">Refreshing...</span>
          )}
        </div>
      </div>

      {/* Summary Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm">🕒 Last Run</div>
          <div className="text-lg font-medium text-gray-800">{data.lastRun}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm">⏭ Next Run</div>
          <div className="text-lg font-medium text-gray-800">{data.nextRun}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-500 text-sm">💧 Tracked Pairs</div>
          <div className="text-lg font-medium text-gray-800">
            {data.pairs.length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow border border-gray-200 bg-white">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-blue-50 border-b border-gray-200">
            <tr>
              {[
                "Pair",
                "Price",
                "Range",
                "Liquidity (LP Tokens)",
                "Token Reserves",
                "LP Value (ETH)",
                "Status",
              ].map((header) => (
                <th key={header} className="p-3 text-center font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.pairs.map((p, i) => (
              <tr
                key={i}
                className={`text-center ${i % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-blue-50 transition`}
              >
                <td className="p-3 font-medium text-blue-700">{p.pair}</td>
                <td className="p-3">{p.price}</td>
                <td className="p-3 text-gray-600">{p.range}</td>
                <td className="p-3 text-gray-700">
                  {(Number(p.liquidity) / 1e18).toFixed(0)} ETH
                </td>
                <td className="p-3 text-sm text-left">
                  <div className="text-blue-600">{p.tokenReserves.token0}</div>
                  <div className="text-indigo-600">{p.tokenReserves.token1}</div>
                </td>
                <td className="p-3 font-semibold text-green-700">
                  {p.totalValueETH}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${p.status.includes("✅")
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                      }`}
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AmmDashboard;
