export default function MobileApp() {
    return (
      <div className="relative">
        <div className="relative z-10 w-64 h-[520px] bg-white rounded-[2.5rem] border-8 border-gray-800 shadow-2xl overflow-hidden">
          {/* Phone notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl"></div>
  
          {/* App content */}
          <div className="pt-8 px-6 h-full bg-red-600 text-white">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full bg-white/20"></div>
                  <span className="text-sm font-medium text-white">Bitcoin Wallet</span>
                </div>
                <div className="h-6 w-6 rounded bg-white/20"></div>
              </div>
  
              {/* Balance */}
              <div className="space-y-2">
                <div className="text-2xl font-bold text-white">BTC 0.0101826</div>
                <div className="text-sm text-white/80">$42,156.00</div>
              </div>
  
              {/* Chart area */}
              <div className="h-32 bg-white/10 rounded-lg flex items-end justify-center p-4">
                <svg className="w-full h-full text-white" viewBox="0 0 200 80">
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    points="0,60 20,45 40,50 60,30 80,35 100,20 120,25 140,15 160,20 180,10 200,15"
                  />
                </svg>
              </div>
  
              {/* Action buttons */}
              <div className="flex space-x-3">
                <button className="flex-1 bg-white text-red-600 py-3 rounded-lg font-medium">Buy</button>
                <button className="flex-1 bg-white/20 text-white py-3 rounded-lg font-medium">Sell</button>
              </div>
  
              {/* Summary section */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-white">Summary</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-white">BTC Current</span>
                    </div>
                    <span className="text-sm text-white">$42,156</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 rounded-full bg-white/40"></div>
                      <span className="text-sm text-white">BTC Invested</span>
                    </div>
                    <span className="text-sm text-white">$38,920</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  