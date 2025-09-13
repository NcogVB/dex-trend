import AskExpertsSection from '../../components/AskExpertsSection'
import EarnPassiveIncomeSection from '../../components/EarnPassiveIncomeSection'
import Converter from '../../components/Converter'
import WalletButton from '../../components/WalletButton'
import JoinCommunity from '../../components/JoinCommunity'

const Swap = () => {
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
                    <Converter />
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

export default Swap
