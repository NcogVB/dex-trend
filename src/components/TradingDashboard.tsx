/* eslint-disable */

import React, { useState, useEffect, useRef } from 'react'
import { widget, type IChartingLibraryWidget } from '../charting_library'
import BinanceDatafeed from '../utils/CryptoDatafeed'
interface TradingDashboardProps {
    className?: string
}

function getLanguageFromURL(): string | null {
    const regex = new RegExp('[\\?&]lang=([^&#]*)')
    const results = regex.exec(window.location.search)
    return results === null
        ? null
        : decodeURIComponent(results[1].replace(/\+/g, ' '))
}

const TradingDashboard: React.FC<TradingDashboardProps> = ({
    className = '',
}) => {
    const [activeTab, setActiveTab] = useState<'open' | 'history'>('open')
    const chartContainerRef = useRef<HTMLDivElement>(null)

    const [currentWidget, setCurrentWidget] =
        useState<IChartingLibraryWidget | null>(null)

    const defaultProps = {
        symbol: 'BTCUSDT',
        interval: '1D' as '1D',
        libraryPath: '/charting_library/',
        chartsStorageUrl: 'https://saveload.tradingview.com',
        chartsStorageApiVersion: '1.1',
        clientId: 'tradingview.com',
        userId: 'public_user_id',
        fullscreen: false,
        autosize: true,
        studiesOverrides: {},
    }

    const createChart = () => {
        if (currentWidget) {
            currentWidget.remove()
        }

        const datafeed = new BinanceDatafeed()

        const widgetOptions = {
            symbol: 'BTCUSDT',
            datafeed,
            interval: defaultProps.interval,
            container: chartContainerRef.current!,
            library_path: defaultProps.libraryPath,
            locale: getLanguageFromURL() || 'en',
            disabled_features: [
                'use_localstorage_for_settings',
                'volume_force_overlay',
                'header_compare',
                'header_screenshot',
                'header_chart_type',
            ],
            enabled_features: [
                'study_templates',
                'side_toolbar_in_fullscreen_mode',
            ],
            charts_storage_url: defaultProps.chartsStorageUrl,
            charts_storage_api_version: defaultProps.chartsStorageApiVersion,
            client_id: defaultProps.clientId,
            user_id: defaultProps.userId,
            fullscreen: defaultProps.fullscreen,
            autosize: defaultProps.autosize,
            studies_overrides: {
                // SMA 100 configuration
                'smoothed moving average.length': 100,
                'smoothed moving average.source': 'close',
                'smoothed moving average.offset': 0,
                'smoothed moving average.style': 0, // 0 = Line, 1 = Step Line, 2 = Histogram
                'smoothed moving average.linewidth': 2,
                'smoothed moving average.plottype': 'line',
                'smoothed moving average.color': '#2196F3', // Blue color for SMA line
            },
            theme: 'light',
            custom_css_url: './charting_library/static/bundles/themed.css',
            overrides: {
                volumePaneSize: 'medium',
                'mainSeriesProperties.candleStyle.upColor': '#26a69a',
                'mainSeriesProperties.candleStyle.downColor': '#ef5350',
                'mainSeriesProperties.candleStyle.drawWick': true,
                'mainSeriesProperties.candleStyle.drawBorder': true,
                'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
                'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
            },
        }
        // @ts-ignore
        const tvWidget = new widget(widgetOptions)

        tvWidget.onChartReady(() => {
            console.log('Chart is ready')
            // Add SMA 100 indicator programmatically
            tvWidget
                .chart()
                .createStudy('Smoothed Moving Average', false, false, {
                    length: 100,
                    source: 'close',
                    offset: 0,
                    'style.linewidth': 2,
                    'style.color': '#2196F3',
                })
        })

        tvWidget.onChartReady(() => {
            tvWidget
                .chart()
                .onDataLoaded()
                .subscribe(null, () => {
                    console.log('Chart data loaded successfully')
                })
        })

        setCurrentWidget(tvWidget)
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            createChart()
        }, 100)

        return () => {
            clearTimeout(timer)
            if (currentWidget) {
                currentWidget.remove()
            }
        }
    }, ['BTCUSDT'])

    const NoOrdersIcon: React.FC = () => (
        <svg
            className="mx-auto"
            width="58"
            height="58"
            viewBox="0 0 58 58"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M2.33301 2.33325H55.6663"
                stroke="#2563EB"
                strokeWidth="3.5"
                strokeLinecap="round"
            />
            <path
                d="M21 25L24.4477 21.5522C25.3366 20.6634 25.781 20.2189 26.3333 20.2189C26.8856 20.2189 27.3301 20.6634 28.219 21.5522L29.7811 23.1143C30.6699 24.0032 31.1144 24.4477 31.6667 24.4477C32.219 24.4477 32.6634 24.0032 33.5523 23.1143L37 19.6666"
                stroke="#2563EB"
                strokeWidth="3.5"
                strokeLinecap="round"
            />
            <path
                d="M29 53L29 42.3333"
                stroke="#2563EB"
                strokeWidth="3.5"
                strokeLinecap="round"
            />
            <path
                d="M23.667 55.6667L29.0003 53"
                stroke="#2563EB"
                strokeWidth="3.5"
                strokeLinecap="round"
            />
            <path
                d="M34.3333 55.6667L29 53"
                stroke="#2563EB"
                strokeWidth="3.5"
                strokeLinecap="round"
            />
            <path
                d="M50.3337 2.33325V24.9999C50.3337 33.1709 50.3337 37.2564 47.6558 39.7948C44.9779 42.3333 40.6679 42.3333 32.0479 42.3333H25.9527C17.3327 42.3333 13.0228 42.3333 10.3449 39.7948C7.66699 37.2564 7.66699 33.1709 7.66699 24.9999V2.33325"
                stroke="#2563EB"
                strokeWidth="3.5"
            />
        </svg>
    )

    return (
        <section className={`mt-[-70px] ${className} mb-5`}>
            <div className="w-full container mx-auto">
                <div className="flex lg:flex-row flex-col gap-3">
                    {/* Trading Chart Section */}
                    <div className="modern-card flex-grow overflow-hidden">
                        <div className="relative w-full lg:h-full h-[500px] overflow-hidden">
                            <div
                                ref={chartContainerRef}
                                className="TVChartContainer absolute top-0 left-0 w-full h-full"
                                style={{ height: '100%', width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Orders Panel Section */}
                    <div className="modern-card">
                        <div className="lg:min-w-[472px] lg:max-w-[472px] w-full md:p-[30px] p-[20px]">
                            {/* Tab Navigation */}
                            <div className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-[8px] px-2 py-1.5 text-sm w-max flex items-center gap-1 mb-[30px]">
                                <button
                                    className={`px-[20px] py-[10px] rounded-[6px] cursor-pointer transition-colors font-medium ${
                                        activeTab === 'open'
                                            ? 'active-orders'
                                            : 'text-[#888888] hover:text-[#333333]'
                                    }`}
                                    onClick={() => setActiveTab('open')}
                                >
                                    Open Orders
                                </button>
                                <button
                                    className={`px-[20px] py-[10px] rounded-[6px] cursor-pointer transition-colors font-medium ${
                                        activeTab === 'history'
                                            ? 'active-orders'
                                            : 'text-[#888888] hover:text-[#333333]'
                                    }`}
                                    onClick={() => setActiveTab('history')}
                                >
                                    Orders History
                                </button>
                            </div>

                            {/* Orders Content */}
                            <div className="bg-[#F8F8F8] rounded-[8px] border border-[#E5E5E5] min-h-[366px] flex items-center justify-center">
                                <div className="">
                                    <NoOrdersIcon />
                                    <h2 className="text-[#333333] text-xl font-semibold mt-[32px] text-center">
                                        {activeTab === 'open'
                                            ? 'No Open Orders Yet'
                                            : 'No Order History Yet'}
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default TradingDashboard
