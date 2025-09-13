import { Wallet, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import AskExpertsSection from '../../components/AskExpertsSection'
import EarnPassiveIncomeSection from '../../components/EarnPassiveIncomeSection'
import WalletButton from '../../components/WalletButton'
import JoinCommunity from '../../components/JoinCommunity'
import { useState } from 'react'
import ConverterPool from '../../components/ConverterPool'

const Pool = () => {
    const [isPanelOpen, setIsPanelOpen] = useState(false)

    const openPanel = () => setIsPanelOpen(true)
    const closePanel = () => setIsPanelOpen(false)

    return (
        <div>
            <div className="hero-section">
                <div className="flex-grow flex flex-col items-center px-4 pt-[40px] md:pt-[88px] container mx-auto w-full">
                    <JoinCommunity />
                    <h1 className="font-semibold text-[40px] leading-[48px] md:text-[80px] md:leading-[88px] text-center align-middle capitalize mb-3 text-[#DC2626] max-w-[720px] mx-auto">
                        <span className="text-[#B91C1C]"> Pool </span> Exchange
                        with DEX.
                    </h1>
                    <p className="text-center font-normal md:text-[17.72px] md:leading-7 text-[#767676] max-w-[700px] mb-6">
                        At our cryptocurrency token exchange platform, we offer
                        an easy-to-use token swap service that allows you to
                        seamlessly exchange one type of token for another with
                        maximum efficiency.
                    </p>
                    <WalletButton />
                    {isPanelOpen ? (
                        // Show ConverterPool with close button inside the div
                        <div className="modern-card w-full max-w-7xl mx-auto px-4 mt-[56px]">
                            {/* Close Button */}
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={closePanel}
                                    className="p-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-full shadow-lg transition-colors duration-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* ConverterPool Component */}
                            <div className="relative z-10">
                                <ConverterPool />
                            </div>
                        </div>
                    ) : (
                        <div className="modern-card mt-[56px] w-full max-w-[690px] mx-auto px-4">
                            <div className="w-full px-[20px] md:px-[40px] py-[30px] md:py-[40px]">
                                <div className="relative z-10 bg-[#F8F8F8] inline-flex px-2 py-1.5 rounded-[8px] border border-[#E5E5E5] mb-6 gap-1">
                                    <Link
                                        to="/swap"
                                        className="rounded-[6px] text-[#888888] font-medium text-sm px-[20px] py-[10px] cursor-pointer hover:text-[#333333] transition-colors"
                                    >
                                        Exchange
                                    </Link>
                                    <Link
                                        to="/pool"
                                        className="rounded-[6px] bg-white text-[#DC2626] font-semibold text-sm px-[20px] py-[10px] cursor-pointer shadow-sm"
                                    >
                                        Pool
                                    </Link>
                                </div>
                                <button
                                    onClick={openPanel}
                                    className={`modern-button relative z-10 w-full flex items-center justify-center space-x-2 mb-6 py-4`}
                                    type="button"
                                >
                                    <Wallet />
                                    <span>Add Liquidity</span>
                                </button>
                                <div className="relative z-10 modern-card p-10 text-center">
                                    <svg
                                        className="mx-auto mb-[22px]"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="64"
                                        height="64"
                                        fill="none"
                                    >
                                        <path
                                            stroke="#B91C1C"
                                            strokeLinecap="round"
                                            strokeWidth="3.5"
                                            d="M5.333 5.333h53.333"
                                        />
                                        <path
                                            stroke="#DC2626"
                                            strokeLinecap="round"
                                            strokeWidth="3.5"
                                            d="m24 28 3.448-3.448c.889-.889 1.333-1.333 1.885-1.333.553 0 .997.444 1.886 1.333l1.562 1.562c.889.89 1.333 1.334 1.886 1.334.552 0 .996-.445 1.885-1.334L40 22.667"
                                        />
                                        <path
                                            stroke="#B91C1C"
                                            strokeLinecap="round"
                                            strokeWidth="3.5"
                                            d="M32 56V45.333M26.667 58.667 32 56M37.333 58.667 32 56"
                                        />
                                        <path
                                            stroke="#B91C1C"
                                            strokeWidth="3.5"
                                            d="M53.334 5.333V28c0 8.171 0 12.257-2.678 14.795-2.678 2.538-6.988 2.538-15.608 2.538h-6.095c-8.62 0-12.93 0-15.608-2.538-2.678-2.538-2.678-6.624-2.678-14.795V5.333"
                                        />
                                    </svg>

                                    <p className="text-[#333333] font-semibold text-xl leading-7 max-w-[380px] mx-auto">
                                        Your Active V2 Liquidity positions
                                        <br />
                                        will appear here
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <section className="md:py-[90px] py-[40px] px-4">
                <h2 className="font-medium lg:text-[64px] sm:text-[48px] text-[32px] md:leading-[70.4px] leading-[50px] text-center text-[#DC2626] max-w-[514px] mx-auto">
                    How
                    <span className="text-[#B91C1C]">Pool </span>Exchange Works
                </h2>
                <p className="font-normal md:text-base text-xs md:leading-[25px] text-center text-[#767676] max-w-[910px] mx-auto pt-[30px]">
                    Ol regnbågsbarn sedan trigraf. Sus bloggosfär. Flexitarian
                    hemin i ben. Disamma. Sat diaren, i idyse. Pånen tiktigt.
                    Ningar polyna. Premussa. Tetrabelt dispere. Epinera.
                    Terranomi fabelt. Dore ser. Ponde nyn. Viter luvis utom
                    dide. Pansexuell låtir om än bobesm. Metrogram vekåvis.
                    Tjejsamla preligt i polig. Niseligen primatyp bibel. Prertad
                    lese. Mytogen bipod trevigon. Rorat filototal. Nepämohet
                    mongen. Rende okålig oaktat paraktiga. Kravallturism pahet.
                    Tick tral. Ananigt lask. Non. Otrohetskontroll egode. Vass
                    stenossade dekapött. Hint krislåda. Kvasise R-tal mivis.
                    Timent bonus malus, kalsongbadare. Plare. Klimatflykting
                    ohidengen. Robotjournalistik pernetik. Spere magisk lang.
                    Tell movis. Rögt lönöligen. Homor åtöligt, töposm. Prede
                    ament. Safariforskning tetrasasade förutom gågging. Reaska
                    multiren dial. Pren previs. Geosa progipäligt. Jypäng
                    snippa. Askbränd pådytining raligt. Platreck kollektomat i
                    mill. Pladade kynde. Andronomi. Progiras våsm fast intrase.
                    Semiren peteteles, homodent. Incel kaktig. Yck eska plus
                    pneumalog. Homon ol megan.
                </p>
                <div className="flex justify-center gap-3 md:mt-[60px] mt-[40px] items-center">
                    <WalletButton />
                    <a
                        href="#"
                        className="border-2 border-[#E9E9E9] md:px-[32px] px-[20px] py-[16px] rounded-[80px] font-medium text-base text-[#000000]"
                    >
                        Learn More
                    </a>
                </div>
            </section>
            <AskExpertsSection />
            <EarnPassiveIncomeSection />
        </div>
    )
}

export default Pool
