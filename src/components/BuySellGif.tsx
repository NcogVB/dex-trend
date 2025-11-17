import BuyGif from '../assets/buy.gif';
import SellGif from '../assets/sell.gif';

function BuySellGifSection() {
    return (
        <section className="w-full bg-white py-16 px-6">
            <div className="max-w-6xl mx-auto text-center">

                {/* Section Header */}
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                     How Buy & Sell Orders Work
                </h2>

                <p className="text-gray-600 max-w-2xl mx-auto mb-12">
                    A simple visual model showing how buy and sell orders execute in real time.
                </p>

                {/* GIF Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                    {/* BUY GIF CARD */}
                    <div className="bg-gray-50 rounded-xl p-6 shadow-md border border-gray-200">
                        <h3 className="text-xl font-semibold text-green-600 mb-4">
                            Buy Order
                        </h3>

                        <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                            <img
                                src={BuyGif}
                                alt="Buy Animation"
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* SELL GIF CARD */}
                    <div className="bg-gray-50 rounded-xl p-6 shadow-md border border-gray-200">
                        <h3 className="text-xl font-semibold text-red-600 mb-4">
                            Sell Order
                        </h3>

                        <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                            <img
                                src={SellGif}
                                alt="Sell Animation"
                                className="w-full"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}


export default BuySellGifSection;
