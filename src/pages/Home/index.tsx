import AskExpertsSection from '../../components/AskExpertsSection'
import EarnPassiveIncomeSection from '../../components/EarnPassiveIncomeSection'
import HeroSection2 from '../../components/HeroSection2'
import FeatureCards from '../../components/FeatureCards'
import MarketTrend from '../../components/MarketTrend'
import PeopleLoveSection from '../../components/PeopleLoveSection'
import SecurelyConnectsSection from '../../components/SecurelyConnectsSection'
import StartInSecondsSection from '../../components/StartInSecondsSection'
import TrustSection from '../../components/TrustSection'
import BuySellGifSection from '../../components/BuySellGif'

function Home() {
    return (
        <>
            <HeroSection2 />
            <BuySellGifSection/>
            <FeatureCards />
            <SecurelyConnectsSection />
            <MarketTrend />
            <TrustSection />
            <StartInSecondsSection />
            <AskExpertsSection />
            <PeopleLoveSection />
            <EarnPassiveIncomeSection />
        </>
    )
}

export default Home
