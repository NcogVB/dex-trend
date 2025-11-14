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
        address: "0x61958f3DB9db9BED7beefB3Def3470f0f07629BB",
        img: "/images/stock-3.png",
    },
    {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x0A7d0AA33FD217A8b7818A6da40b45603C4c367E", // 
        img: "/images/stock-5.png",
    },
    {
        symbol: "ETH",
        name: "Ethereum",
        address: "0x0703F58602aB1a8a84c1812486a8b4Cf07c5A5Da",
        img: "/images/eth.png",
    },
    {
        symbol: "MATIC",
        name: "Polygon",
        address: "0x2bf5F367B1559a93f1FAF4A194478E707738F6bD",
        img: "/images/pol.png",
    },
    {
        symbol: "BTC",
        name: "Bitcoin",
        address: "0x0133394e4A539F81Ec51b81dE77f1BeBF6497946",
        img: "/images/stock-1.png",
    },
    {
        symbol: "BNB",
        name: "BNB",
        address: "0xb4753c1EDDE1D79ec36363F116D2E7DF4dec0402",
        img: "/images/bnb.png",
    },
    {
        symbol: "SOL",
        name: "Solana",
        address: "0xb4306EceB7Bb2a363F8344575Fc75ab388206A01", // 
        img: "/images/sol.jpg",
    },
    {
        symbol: "DOGE",
        name: "Dogecoin",
        address: "0x1F35acD37d2fe4c533c1774a76F0b7dCba76D609",
        img: "/images/dodge.jpg",
    },
    {
        symbol: "TRX",
        name: "Tron",
        address: "0xb077F3E3fC7A102BAE0D77930108c4b15e280054",
        img: "/images/tron.png",
    },
    {
        symbol: "ADA",
        name: "Cardano",
        address: "0x54B037Ac3b58C221e86B4f3DeD5922f7CD084769",
        img: "/images/cardano.png",
    },
    {
        symbol: "HYPE",
        name: "Hyperliquid",
        address: "0xBd2Ae006376Bd45432153c0C08189daC2706aADF",
        img: "/images/hp.jpg",
    },
    {
        symbol: "USDE",
        name: "USDE",
        address: "0x5BB6551b030f3609f1076C9433Ab8A3a3BAFFa8C",
        img: "/images/stock-5.png",
    },
    {
        symbol: "LINK",
        name: "Chainlink",
        address: "0x944c1FFD41Bf305b4dCc37F7D1648829b41f4758",
        img: "/images/stock-5.png",
    },
    {
        symbol: "AVAX",
        name: "Avalanche",
        address: "0x111915A20361a2c46a508c53Af5DeA1ed01DC0F2",
        img: "/images/avax.png",
    },
    {
        symbol: "XLM",
        name: "Stellar",
        address: "0xC38C3a89460D6c57fd5f77b00c854bf7D3686C8D",
        img: "/images/stellar.png",
    },
    {
        symbol: "SUI",
        name: "Sui",
        address: "0x606e4b1b1405fE226C7ddC491B85Ad5003717E08",
        img: "/images/sui.png",
    },
    {
        symbol: "HBAR",
        name: "Hedera",
        address: "0xDecfe53d2998F954709B144e846814d40ad8e9f2",
        img: "/images/hedera.png",
    },
    {
        symbol: "LEO",
        name: "LEO Token",
        address: "0x628BaDb5E5Cc743e710dc5161bA9614fE360aBe2",
        img: "/images/leo.jpg",
    },
    {
        symbol: "TON",
        name: "Toncoin",
        address: "0x96A95F5A25A6b3d0658e261e69965Dd9E4b0789F",
        img: "/images/ton.png",
    },
    {
        symbol: "DOT",
        name: "Polkadot",
        address: "0xCbc7Be8802E930ddC8BDf08E3bcDBd58E30B5d44",
        img: "/images/dot.png",
    },
    {
        symbol: "GALA",
        name: "Gala",
        address: "0x818fE6CC6f48e4379b89f449483A8eEDEA330425",
        img: "/images/gala.png",
    },
    {
        symbol: "ENA",
        name: "ENA",
        address: "0xfBCE373dC5201916CFaf627f4fCc307b9010D3e0",
        img: "/images/ens.png",
    },
    {
        symbol: "LDO",
        name: "Lido DAO",
        address: "0x9181F63E1092B65B0c6271f0D649EB1183dFd2b6",
        img: "/images/lido.jpg",
    },
];

