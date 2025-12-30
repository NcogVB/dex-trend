export interface Token {
    symbol: string;
    name: string;
    address: string;
    img: string;
    realBalance?: string  // raw string from ethers.formatUnits
    balance?: number      // parsed number for math
}

export const TOKENS: Token[] = [
    {
        symbol: "USDT",
        name: "Tether",
        address: "0x0F7782ef1Bd024E75a47d344496022563F0C1A38",
        img: "/images/stock-3.png",
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x72A042A8a454BF928Cf940f720875A73cBc84a84",
        img: "/images/stock-5.png",
    },
    {
        symbol: "ETH",
        name: "Ethereum",
        address: "0x50Bb32FCB594978967265135E4d41849d7F646e0",
        img: "/images/eth.png",
    },
    {
        symbol: "MATIC",
        name: "Polygon",
        address: "0xF8705A80676725ADBA0d111792fbdfc92255F595",
        img: "/images/pol.png",
    },
    {
        symbol: "BTC",
        name: "Bitcoin",
        address: "0x472712a5eBF2e8341A3091Cd9C05A6fd42814d14",
        img: "/images/stock-1.png",
    },
    {
        symbol: "BNB",
        name: "BNB",
        address: "0x6987b2ac4CCf7f48e5B0eF4C2F499F49f81f37b3",
        img: "/images/bnb.png",
    },
    {
        symbol: "SOL",
        name: "Solana",
        address: "0xc927a357Ae3dEC46BF7eBB047942B488f8c01238",
        img: "/images/sol.jpg",
    },
    {
        symbol: "DOGE",
        name: "Dogecoin",
        address: "0x61d5144E54960855Ec0aAD5934666606A9A00126",
        img: "/images/dodge.jpg",
    },
    {
        symbol: "TRX",
        name: "Tron",
        address: "0xF777A2A02cC7b55A6bC1b9bB6D832cFF8884BbA3",
        img: "/images/tron.png",
    },
    {
        symbol: "ADA",
        name: "Cardano",
        address: "0x55B69991f8456B16746f9edf6B3dEB0Cdd62D0EF",
        img: "/images/cardano.png",
    },
    {
        symbol: "HYPE",
        name: "Hyperliquid",
        address: "0xdCa42fd635B682c90494B5A21BAC4983F9488242",
        img: "/images/hp.jpg",
    },
    {
        symbol: "USDE",
        name: "USDE",
        address: "0xB25202f5748116bC5A5e9eB3fCaBC7d5b5777996",
        img: "/images/stock-5.png",
    },
    {
        symbol: "LINK",
        name: "Chainlink",
        address: "0x5C219A513A4198a84dAcf088c229E41257838A8d",
        img: "/images/stock-5.png",
    },
    {
        symbol: "AVAX",
        name: "Avalanche",
        address: "0xf75E9a9AD4022bADee7878f4E65c8db398fbC5f4",
        img: "/images/avax.png",
    },
    {
        symbol: "XLM",
        name: "Stellar",
        address: "0x915B598672af18CB88B074B8689419752Fba2199",
        img: "/images/stellar.png",
    },
    {
        symbol: "SUI",
        name: "Sui",
        address: "0xd918a6EC7Ae556D38fE6F76C27f17f99a1CD3d2F",
        img: "/images/sui.png",
    },
    {
        symbol: "HBAR",
        name: "Hedera",
        address: "0xEc0629035F1AA6A71f3B2eBc6145EF26d74f8E3B",
        img: "/images/hedera.png",
    },
    {
        symbol: "LEO",
        name: "LEO Token",
        address: "0xd75fA7c2380f539320F9ABD29D09f48DbEB0E13E",
        img: "/images/leo.jpg",
    },
    {
        symbol: "TON",
        name: "Toncoin",
        address: "0x4B8B79BB520728ffba0201F7B65a7E2A1505007E",
        img: "/images/ton.png",
    },
    {
        symbol: "DOT",
        name: "Polkadot",
        address: "0x36fFcfd7B91c261f56A98Bf9F6F6B596cbdC837E",
        img: "/images/dot.png",
    },
    {
        symbol: "GALA",
        name: "Gala",
        address: "0x48cA5b08052E98b9204Efd299bF4950D8d6FbBc7",
        img: "/images/gala.png",
    },
    {
        symbol: "ENA",
        name: "ENA",
        address: "0x121Af72ceF324aA2a713bbB333A2A770daC24a00",
        img: "/images/ens.png",
    },
    {
        symbol: "LDO",
        name: "Lido DAO",
        address: "0xa4F09a22Ffc533b23A1C8e73290dAd69F065978f",
        img: "/images/lido.jpg",
    },
];
