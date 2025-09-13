import AskExpertsSection from '../../components/AskExpertsSection'
import EarnPassiveIncomeSection from '../../components/EarnPassiveIncomeSection'
import HeroSection from '../../components/HeroSection'
import MarketTrend from '../../components/MarketTrend'
import PeopleLoveSection from '../../components/PeopleLoveSection'
import SecurelyConnectsSection from '../../components/SecurelyConnectsSection'
import StartInSecondsSection from '../../components/StartInSecondsSection'
import TrustSection from '../../components/TrustSection'

function Home() {
    return (
        <>
            <HeroSection />
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
