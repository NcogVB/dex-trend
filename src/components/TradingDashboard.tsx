import React, { useState, useEffect, useRef } from "react";
import { widget, type IChartingLibraryWidget } from "../charting_library";
import BinanceDatafeed from "../utils/CryptoDatafeed";

interface TradingDashboardProps {
    className?: string;
    fullScreen?: boolean;
    showOrders?: boolean;
    pair?: string; // e.g. "BNBUSDT"
}

function getLanguageFromURL(): string | null {
    const regex = new RegExp("[\\?&]lang=([^&#]*)");
    const results = regex.exec(window.location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

const TradingDashboard: React.FC<TradingDashboardProps> = ({
    className = "",
    fullScreen = false,
    pair = "BNBUSDT", // default fallback
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [currentWidget, setCurrentWidget] = useState<IChartingLibraryWidget | null>(null);

    const defaultProps = {
        symbol: pair,
        interval: "1D" as "1D",
        libraryPath: "/charting_library/",
        chartsStorageUrl: "https://saveload.tradingview.com",
        chartsStorageApiVersion: "1.1",
        clientId: "tradingview.com",
        userId: "public_user_id",
        fullscreen: false,
        autosize: true,
        studiesOverrides: {},
    };

    const createChart = () => {
        if (currentWidget) {
            currentWidget.remove();
        }

        const datafeed = new BinanceDatafeed();

        const widgetOptions = {
            symbol: pair,
            datafeed,
            interval: defaultProps.interval,
            container: chartContainerRef.current!,
            library_path: defaultProps.libraryPath,
            locale: getLanguageFromURL() || "en",
            disabled_features: [
                "use_localstorage_for_settings",
                "volume_force_overlay",
                "header_compare",
                "header_screenshot",
                "header_chart_type",
            ],
            enabled_features: ["study_templates", "side_toolbar_in_fullscreen_mode"],
            charts_storage_url: defaultProps.chartsStorageUrl,
            charts_storage_api_version: defaultProps.chartsStorageApiVersion,
            client_id: defaultProps.clientId,
            user_id: defaultProps.userId,
            fullscreen: defaultProps.fullscreen,
            autosize: defaultProps.autosize,
            studies_overrides: {
                "smoothed moving average.length": 100,
                "smoothed moving average.source": "close",
                "smoothed moving average.offset": 0,
                "smoothed moving average.style": 0,
                "smoothed moving average.linewidth": 2,
                "smoothed moving average.plottype": "line",
                "smoothed moving average.color": "#2196F3",
            },
            theme: "light",
            custom_css_url: "./charting_library/static/bundles/themed.css",
            overrides: {
                volumePaneSize: "medium",
                "mainSeriesProperties.candleStyle.upColor": "#26a69a",
                "mainSeriesProperties.candleStyle.downColor": "#ef5350",
                "mainSeriesProperties.candleStyle.drawWick": true,
                "mainSeriesProperties.candleStyle.drawBorder": true,
                "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
                "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
            },
        } as any;

        // @ts-ignore
        const tvWidget = new widget(widgetOptions);

        tvWidget.onChartReady(() => {
            console.log("Chart is ready");
            tvWidget.chart().createStudy("Smoothed Moving Average", false, false, {
                length: 100,
                source: "close",
                offset: 0,
                "style.linewidth": 2,
                "style.color": "#2196F3",
            });
        });

        tvWidget.onChartReady(() => {
            tvWidget
                .chart()
                .onDataLoaded()
                .subscribe(null, () => {
                    console.log("Chart data loaded successfully");
                });
        });

        setCurrentWidget(tvWidget);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            createChart();
        }, 100);

        return () => {
            clearTimeout(timer);
            if (currentWidget) {
                currentWidget.remove();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pair]);

    return (
        <section
            className={`${className} w-full ${fullScreen ? " py-0" : " py-4"}`}
        >
            <div className={`w-full`}>
                <div className="flex flex-col lg:flex-row gap-3 h-auto lg:h-[55vh] lg:md:h-[62vh]">
                    {/* Trading Chart Section */}
                    <div className="modern-card w-full lg:w-[100%] overflow-hidden h-[50vh] lg:h-full">
                        <div className="relative w-full h-full overflow-hidden">
                            <div
                                ref={chartContainerRef}
                                className="TVChartContainer absolute top-0 left-0 w-full h-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TradingDashboard;