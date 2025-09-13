import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'
import { WalletProvider } from '../contexts/WalletContext'
import WalletModal from './WalletModel'

const Layout = () => {
    return (
        <WalletProvider>
            {/* Add top padding to compensate for fixed header */}
            <div className="pt-20">
                <Header />
                <Outlet />
                <Footer />
                <WalletModal />
            </div>
        </WalletProvider>
    )
}

export default Layout
