import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Header from './Header'
import { WalletProvider } from '../contexts/WalletContext'

const Layout = () => {
    return (
        <WalletProvider>
            {/* Add top padding to compensate for fixed header */}
            <div>
                <Header />
                <Outlet />
                <Footer />
            </div>
        </WalletProvider>
    )
}

export default Layout
