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
        address: "0xC26efb6DB570DEE4BD0541A1ed52B590F05E3E3B",
        img: "/images/stock-3.png",
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x553fE3CA2A5F304857A7c2C78b37686716B8c89b",
        img: "/images/stock-5.png",
    },
    {
        symbol: "ETH",
        name: "Ethereum",
        address: "0x024b8A87BE821B27aAaecb878fDBd3F49ad3bcb2",
        img: "/images/eth.png",
    },
    {
        symbol: "MATIC",
        name: "Polygon",
        address: "0xd63bE903F182B04901b01C9E487428B8B37CA04A",
        img: "/images/pol.png",
    },
    {
        symbol: "BTC",
        name: "Bitcoin",
        address: "0x8c40B773dEb625E31776F765F73E5E55386c46A7",
        img: "/images/stock-1.png",
    },
    {
        symbol: "BNB",
        name: "BNB",
        address: "0xCA1BCb9969A3d8D52E74Cd3901692e9A8a323af1",
        img: "/images/bnb.png",
    },
    {
        symbol: "SOL",
        name: "Solana",
        address: "0x9c3450b3F6e6c2e507624248a56Fa4A561c56341",
        img: "/images/sol.jpg",
    },
    {
        symbol: "DOGE",
        name: "Dogecoin",
        address: "0xaFa5c971197Fd71C13fF1288760CbB2C02685762",
        img: "/images/dodge.jpg",
    },
    {
        symbol: "TRX",
        name: "Tron",
        address: "0xCe0B826cE613392B081DF1f5530c923Df8122318",
        img: "/images/tron.png",
    },
    {
        symbol: "ADA",
        name: "Cardano",
        address: "0xede25454E7F50a925BA00174164E0C6d818E4b25",
        img: "/images/cardano.png",
    },
    {
        symbol: "HYPE",
        name: "Hyperliquid",
        address: "0xE33bB94634993FD4ED3BFA0393b241eA2c421FC9",
        img: "/images/hp.jpg",
    },
    {
        symbol: "USDE",
        name: "USDE",
        address: "0xdb89A380171339c14ce316E2c7c32e8aCD8037fb",
        img: "/images/stock-5.png",
    },
    {
        symbol: "LINK",
        name: "Chainlink",
        address: "0xC2fcF23Fad9c5Be08bD07E3955e8A0F31B0800bA",
        img: "/images/stock-5.png",
    },
    {
        symbol: "AVAX",
        name: "Avalanche",
        address: "0xb6714316dE097AA83B4E2bAf0A22FeB490fE3f98",
        img: "/images/avax.png",
    },
    {
        symbol: "XLM",
        name: "Stellar",
        address: "0xfE1FA246e89b016a9aD89d8fE859779a19953B60",
        img: "/images/stellar.png",
    },
    {
        symbol: "SUI",
        name: "Sui",
        address: "0x6f4fe748B6f314144D0cEfdC93f322e9BB484a9e",
        img: "/images/sui.png",
    },
    {
        symbol: "HBAR",
        name: "Hedera",
        address: "0x527F81c964c22c93fd613EE82661499C0f466c38",
        img: "/images/hedera.png",
    },
    {
        symbol: "LEO",
        name: "LEO Token",
        address: "0x1AD308131c715955dEbe2Df748B6C4769C5Dc626", // picked one of the 3
        img: "/images/leo.jpg",
    },
    {
        symbol: "SHIB",
        name: "Shiba Inu",
        address: "0xC9b6B70b5c4CBA9DA3871Ea63a64E5D76d259520",
        img: "/images/shib.png",
    },
    {
        symbol: "TON",
        name: "Toncoin",
        address: "0x4f665Ef2EF5336D26a6c06525DD812786E5614c6",
        img: "/images/ton.png",
    },
    {
        symbol: "DOT",
        name: "Polkadot",
        address: "0xA432ED2326aA53Fe959E9B2110c4958ADb1FFdBB",
        img: "/images/dot.png",
    },
    {
        symbol: "GALA",
        name: "Gala",
        address: "0xDA9077EEC87279253B4F9b375Cf5B4e2de5C10be",
        img: "/images/gala.png",
    },
    {
        symbol: "ENA",
        name: "ENA",
        address: "0xD154A41aFA7c7Ad17f6B2de930f6E63f33Aa41C2",
        img: "/images/ens.png",
    },
    {
        symbol: "LDO",
        name: "Lido DAO",
        address: "0x2370C9aA0C996AF2C0D5eB47190B4C9d3426f085",
        img: "/images/lido.jpg",
    },
];
