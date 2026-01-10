import { Link } from 'react-router-dom'
import MobileApp from './MobileApp'

export default function HeroSection2() {
    return (
        <section className="relative overflow-hidden p-10 ">
            {/* Background accents */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-red-300/10 blur-3xl" />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-48 w-[60%] bg-gradient-to-r from-red-500/10 via-red-400/10 to-transparent rounded-full blur-2xl" />
            </div>

            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <div className="space-y-5">
                            <span className="inline-flex items-center rounded-full border border-red-200 bg-white/70 px-3 py-1 text-xs font-medium text-red-700 backdrop-blur">
                                Live crypto trading
                            </span>

                            <h1 className="text-4xl lg:text-6xl font-bold text-balance leading-tight text-gray-900">
                                The easiest way to{' '}
                                <span className="text-gray-900">
                                    buy & sell
                                </span>{' '}
                                <span className="relative inline-block">
                                    <span className="bg-gradient-to-r from-red-600 via-red-500 to-red-700 bg-clip-text text-transparent">
                                        cryptocurrency
                                    </span>
                                    <span className="absolute -bottom-2 left-0 h-[6px] w-9/12 rounded-full bg-red-500/20" />
                                </span>
                            </h1>

                            <p className="text-lg text-gray-600 max-w-xl">
                                Trade faster with a clean, professional UI.
                                Non‑custodial, secure, and built for
                                performance.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <Link to="/exchange">
                                <button className="bg-red-600 text-white hover:bg-red-700 px-8 py-3 text-base font-medium rounded-md transition-colors">
                                    Start Now
                                </button>
                            </Link>
                            <button className="px-8 py-3 text-base font-medium rounded-md border border-red-200 text-red-700 hover:bg-red-50 transition-colors">
                                Learn More
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700">
                                    ✓
                                </span>
                                Secure & non‑custodial
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700">
                                    ✓
                                </span>
                                Deep liquidity
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700">
                                    ✓
                                </span>
                                24/7 markets
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center lg:justify-end">
                        <MobileApp />
                    </div>
                </div>

                <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className="rounded-xl border border-red-100 bg-white/70 p-4 text-center backdrop-blur">
                        <div className="text-sm text-gray-500">
                            Active Users
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">
                            120k+
                        </div>
                    </div>
                    <div className="rounded-xl border border-red-100 bg-white/70 p-4 text-center backdrop-blur">
                        <div className="text-sm text-gray-500">
                            Supported Chains
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">
                            10+
                        </div>
                    </div>
                    <div className="rounded-xl border border-red-100 bg-white/70 p-4 text-center backdrop-blur">
                        <div className="text-sm text-gray-500">
                            Avg. Swap Time
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">
                            ~3s
                        </div>
                    </div>
                    <div className="rounded-xl border border-red-100 bg-white/70 p-4 text-center backdrop-blur">
                        <div className="text-sm text-gray-500">Uptime</div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">
                            99.9%
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
