export default function FeatureCards() {
    return (
        <section className="py-20 bg-gray-50/50">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white rounded-lg border border-gray-200 text-center group hover:shadow-lg transition-shadow p-6">
                        <div className="space-y-4 mb-6">
                            <div className="mx-auto w-16 h-16 bg-blue-600/10 rounded-lg flex items-center justify-center group-hover:bg-blue-600/20 transition-colors overflow-hidden">
                                <img
                                    src="/ethereum-coin-giveaway-reward.jpg"
                                    alt="Ethereum giveaway"
                                    width={32}
                                    height={32}
                                    className="rounded"
                                />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                ETHEREUM GIVEAWAY
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <p className="text-gray-600">
                                Participate now and win free Ethereum tokens.
                            </p>
                            <button className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 text-sm font-medium rounded-md transition-colors">
                                Buy Now →
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 text-center group hover:shadow-lg transition-shadow p-6">
                        <div className="space-y-4 mb-6">
                            <div className="mx-auto w-16 h-16 bg-blue-600/10 rounded-lg flex items-center justify-center group-hover:bg-blue-600/20 transition-colors overflow-hidden">
                                <img
                                    src="/cryptocurrency-exchange-trading-buy-sell.jpg"
                                    alt="Buy and sell crypto"
                                    width={32}
                                    height={32}
                                    className="rounded"
                                />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                BUY AND SELL CRYPTO
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <p className="text-gray-600">
                                Buy and sell popular digital currencies with
                                ease.
                            </p>
                            <button className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 text-sm font-medium rounded-md transition-colors">
                                Buy Now →
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 text-center group hover:shadow-lg transition-shadow p-6">
                        <div className="space-y-4 mb-6">
                            <div className="mx-auto w-16 h-16 bg-blue-600/10 rounded-lg flex items-center justify-center group-hover:bg-blue-600/20 transition-colors overflow-hidden">
                                <img
                                    src="/portfolio-tracking-analytics-chart-dashboard.jpg"
                                    alt="Track your portfolio"
                                    width={32}
                                    height={32}
                                    className="rounded"
                                />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                TRACK YOUR PORTFOLIO
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <p className="text-gray-600">
                                Keep track of them all in one place.
                            </p>
                            <button className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 text-sm font-medium rounded-md transition-colors">
                                Track Now →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
