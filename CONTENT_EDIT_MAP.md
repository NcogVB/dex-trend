# DEX-Trend Content Update Map

This document provides a comprehensive guide for updating titles, descriptions, and other content across all pages of the DEX-Trend application.

## Table of Contents

1. [Home Page (`/`)](#home-page-)
2. [Swap Page (`/home`)](#swap-page-home)
3. [Bridge Page (`/bridge`)](#bridge-page-bridge)
4. [Limit Order Page (`/exchange`)](#limit-order-page-exchange)
5. [Pool Page (`/pool`)](#pool-page-pool)
6. [Add Liquidity Page (`/addlp`)](#add-liquidity-page-addlp)
7. [Remove Liquidity Page (`/removeLp`)](#remove-liquidity-page-removelp)
8. [Shared Components](#shared-components)

---

## Home Page (`/`)

**File:** `src/pages/Home/index.tsx`

### Components Used:

- `HeroSection2`
- `FeatureCards`
- `SecurelyConnectsSection`
- `MarketTrend`
- `TrustSection`
- `StartInSecondsSection`
- `AskExpertsSection`
- `PeopleLoveSection`
- `EarnPassiveIncomeSection`

### Content Update Areas:

#### 1. HeroSection2 Component

**File:** `src/components/HeroSection2.tsx`

| Line    | Element          | Current Content                                                                                 | Update Type      |
| ------- | ---------------- | ----------------------------------------------------------------------------------------------- | ---------------- |
| 18      | Badge            | "Live crypto trading"                                                                           | **Title/Badge**  |
| 21-32   | Main Heading     | "The easiest way to buy & sell cryptocurrency"                                                  | **Main Title**   |
| 34-38   | Description      | "Trade faster with a clean, professional UI. Non‑custodial, secure, and built for performance." | **Description**  |
| 42-44   | CTA Button       | "Start Now"                                                                                     | **Button Text**  |
| 45-47   | Secondary Button | "Learn More"                                                                                    | **Button Text**  |
| 55      | Feature          | "Secure & non‑custodial"                                                                        | **Feature Text** |
| 61      | Feature          | "Deep liquidity"                                                                                | **Feature Text** |
| 67      | Feature          | "24/7 markets"                                                                                  | **Feature Text** |
| 80-84   | Stats            | "Active Users: 120k+"                                                                           | **Statistics**   |
| 88-92   | Stats            | "Supported Chains: 10+"                                                                         | **Statistics**   |
| 96-100  | Stats            | "Avg. Swap Time: ~3s"                                                                           | **Statistics**   |
| 103-107 | Stats            | "Uptime: 99.9%"                                                                                 | **Statistics**   |

#### 2. FeatureCards Component

**File:** `src/components/FeatureCards.tsx`

| Line  | Element            | Current Content                                      | Update Type          |
| ----- | ------------------ | ---------------------------------------------------- | -------------------- |
| 18-19 | Card 1 Title       | "ETHEREUM GIVEAWAY"                                  | **Card Title**       |
| 22-24 | Card 1 Description | "Participate now and win free Ethereum tokens."      | **Card Description** |
| 25-27 | Card 1 Button      | "Buy Now →"                                          | **Button Text**      |
| 42-44 | Card 2 Title       | "BUY AND SELL CRYPTO"                                | **Card Title**       |
| 47-50 | Card 2 Description | "Buy and sell popular digital currencies with ease." | **Card Description** |
| 51-53 | Card 2 Button      | "Buy Now →"                                          | **Button Text**      |
| 68-70 | Card 3 Title       | "TRACK YOUR PORTFOLIO"                               | **Card Title**       |
| 73-75 | Card 3 Description | "Keep track of them all in one place."               | **Card Description** |
| 76-78 | Card 3 Button      | "Track Now →"                                        | **Button Text**      |

#### 3. MarketTrend Component

**File:** `src/components/MarketTrend.tsx`

| Line    | Element          | Current Content                                 | Update Type          |
| ------- | ---------------- | ----------------------------------------------- | -------------------- |
| 184-186 | Section Title    | "Market Trend"                                  | **Section Title**    |
| 188-192 | View More Button | "View more"                                     | **Button Text**      |
| 242-246 | Empty State      | "Select a category to view cryptocurrency data" | **Empty State Text** |

#### 4. AskExpertsSection Component

**File:** `src/components/AskExpertsSection.tsx`

| Line  | Element     | Current Content                                                                                                                          | Update Type           |
| ----- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 59-62 | Main Title  | "Ask Anything. From our Experts."                                                                                                        | **Main Title**        |
| 75    | Placeholder | "Type your crypto question here..."                                                                                                      | **Input Placeholder** |
| 94-98 | Description | "Just type in your queries and send them to our experts via Telegram. You will get the answers of your queries in no time about crypto." | **Description**       |

#### 5. EarnPassiveIncomeSection Component

**File:** `src/components/EarnPassiveIncomeSection.tsx`

| Line  | Element     | Current Content                                           | Update Type     |
| ----- | ----------- | --------------------------------------------------------- | --------------- |
| 3-6   | Main Title  | "Earn passive income with crypto"                         | **Main Title**  |
| 7-9   | Description | "Dextrend make it easy to make your crypto work for you." | **Description** |
| 10-12 | Subtitle    | "It's time to unlock the full potential of your money."   | **Subtitle**    |
| 16-18 | CTA Button  | "Start your journey"                                      | **Button Text** |

---

## Swap Page (`/home`)

**File:** `src/pages/swap/index.tsx`

### Content Update Areas:

| Line  | Element             | Current Content                                                                                                                                                                           | Update Type             |
| ----- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 13-16 | Main Title          | "Pool Exchange with DEX."                                                                                                                                                                 | **Main Title**          |
| 17-22 | Description         | "At our cryptocurrency token exchange platform, we offer an easy-to-use token swap service that allows you to seamlessly exchange one type of token for another with maximum efficiency." | **Description**         |
| 28-31 | Section Title       | "How Pool Exchange Works"                                                                                                                                                                 | **Section Title**       |
| 32-35 | Section Description | "Swap any supported token on Dextrend with a fast, intuitive interface and transparent pricing. No sign‑up required."                                                                     | **Section Description** |
| 42-43 | Learn More Button   | "Learn More"                                                                                                                                                                              | **Button Text**         |

### Converter Component

**File:** `src/components/Converter.tsx`

| Line    | Element             | Current Content                               | Update Type      |
| ------- | ------------------- | --------------------------------------------- | ---------------- |
| 174-176 | Tab                 | "Exchange"                                    | **Tab Text**     |
| 179-181 | Tab                 | "Pool"                                        | **Tab Text**     |
| 187     | Warning             | "Connect your wallet to start trading"        | **Warning Text** |
| 388-390 | Exchange Rate Label | "Exchange Rate"                               | **Label Text**   |
| 399-401 | Slippage Label      | "Slippage Tolerance"                          | **Label Text**   |
| 425-434 | Button Text         | "Exchange" / "Connect Wallet" / "Swapping..." | **Button Text**  |

---

## Bridge Page (`/bridge`)

**File:** `src/pages/bridge/index.tsx`

### Content Update Areas:

| Line    | Element             | Current Content                                                                                                                                                                           | Update Type             |
| ------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 379-382 | Main Title          | "Bridge Exchange with DEX."                                                                                                                                                               | **Main Title**          |
| 383-388 | Description         | "At our cryptocurrency token exchange platform, we offer an easy-to-use token swap service that allows you to seamlessly exchange one type of token for another with maximum efficiency." | **Description**         |
| 414-416 | Chain Label         | "Chain"                                                                                                                                                                                   | **Label Text**          |
| 697-698 | Price Label         | "Price"                                                                                                                                                                                   | **Label Text**          |
| 704-705 | Slippage Label      | "Slippage Tolerance"                                                                                                                                                                      | **Label Text**          |
| 774-777 | Button Text         | "Exchange" / "Processing..."                                                                                                                                                              | **Button Text**         |
| 784-787 | Section Title       | "How Cross Chain Exchange Works"                                                                                                                                                          | **Section Title**       |
| 788-792 | Section Description | "Bridge assets across chains with Dextrend using a secure, streamlined flow and clear status tracking. Low fees and fast finality."                                                       | **Section Description** |
| 799-800 | Learn More Button   | "Learn More"                                                                                                                                                                              | **Button Text**         |

---

## Limit Order Page (`/exchange`)

**File:** `src/pages/limit/index.tsx`

### Content Update Areas:

| Line    | Element             | Current Content                                                                                                                                                                           | Update Type             |
| ------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 175-178 | Main Title          | "Pool Exchange with DEX."                                                                                                                                                                 | **Main Title**          |
| 179-184 | Description         | "At our cryptocurrency token exchange platform, we offer an easy-to-use token swap service that allows you to seamlessly exchange one type of token for another with maximum efficiency." | **Description**         |
| 411-412 | Exchange Rate Label | "Exchange Rate"                                                                                                                                                                           | **Label Text**          |
| 426-430 | Expiration Label    | "Expiration Date"                                                                                                                                                                         | **Label Text**          |
| 437-438 | Slippage Label      | "Slippage Tolerance"                                                                                                                                                                      | **Label Text**          |
| 483-485 | Button Text         | "Create Limit Order" / "Creating Order..."                                                                                                                                                | **Button Text**         |
| 492-495 | Section Title       | "How Pool Exchange Works"                                                                                                                                                                 | **Section Title**       |
| 496-500 | Section Description | "Place limit orders on Dextrend to execute at your price, with smart routing, transparent fees, and a clean interface that keeps you focused on the trade."                               | **Section Description** |
| 507-508 | Learn More Button   | "Learn More"                                                                                                                                                                              | **Button Text**         |

---

## Pool Page (`/pool`)

**File:** `src/pages/pool/index.tsx`

### Content Update Areas:

| Line    | Element                 | Current Content                                                                                                                                                                           | Update Type             |
| ------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 14-17   | Main Title              | "Pool Exchange with DEX."                                                                                                                                                                 | **Main Title**          |
| 18-23   | Description             | "At our cryptocurrency token exchange platform, we offer an easy-to-use token swap service that allows you to seamlessly exchange one type of token for another with maximum efficiency." | **Description**         |
| 33-34   | Tab                     | "Exchange"                                                                                                                                                                                | **Tab Text**            |
| 39-40   | Tab                     | "Pool"                                                                                                                                                                                    | **Tab Text**            |
| 46-48   | Add Liquidity Button    | "Add Liquidity"                                                                                                                                                                           | **Button Text**         |
| 53-55   | Remove Liquidity Button | "Remove Liquidity"                                                                                                                                                                        | **Button Text**         |
| 90-93   | Position Check Text     | "Check Your Active Liquidity positions"                                                                                                                                                   | **Info Text**           |
| 100-103 | Section Title           | "How Pool Exchange Works"                                                                                                                                                                 | **Section Title**       |
| 104-108 | Section Description     | "Provide liquidity on Dextrend and earn fees from every trade in your pool. Manage positions with precise controls and real‑time stats."                                                  | **Section Description** |
| 115-116 | Learn More Button       | "Learn More"                                                                                                                                                                              | **Button Text**         |

---

## Add Liquidity Page (`/addlp`)

**File:** `src/components/ConverterPool.tsx`

### Content Update Areas:

| Line    | Element              | Current Content                                                                                                                                                                            | Update Type             |
| ------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| 169-172 | Main Title           | "Pool Exchange with DEX."                                                                                                                                                                  | **Main Title**          |
| 173-178 | Description          | "At our cryptocurrency token exchange platform, we offer an easy-to-use token swap service that allows you to seamlessly exchange one type of token for another with maximum efficiency."  | **Description**         |
| 189-190 | Back Button          | "Back"                                                                                                                                                                                     | **Button Text**         |
| 192-194 | Section Title        | "Your Liquidity"                                                                                                                                                                           | **Section Title**       |
| 197     | Input Placeholder    | "Enter Token ID To Load Values"                                                                                                                                                            | **Input Placeholder**   |
| 204-207 | Pool Tokens Label    | "Pool Tokens"                                                                                                                                                                              | **Label Text**          |
| 209     | Token Label          | "Wpol"                                                                                                                                                                                     | **Token Label**         |
| 214     | Token Label          | "USDC.e"                                                                                                                                                                                   | **Token Label**         |
| 221     | Reward Label         | "Reward"                                                                                                                                                                                   | **Label Text**          |
| 228-230 | Position Value Label | "Position Value"                                                                                                                                                                           | **Label Text**          |
| 236-238 | Add Liquidity Label  | "Add Liquidity"                                                                                                                                                                            | **Label Text**          |
| 253-257 | Button Text          | "Add Liquidity" / "Adding Liquidity..."                                                                                                                                                    | **Button Text**         |
| 263-266 | Section Title        | "How Pool Exchange Works"                                                                                                                                                                  | **Section Title**       |
| 267-272 | Section Description  | "Dextrend provides intuitive liquidity tools and clear insights so you can add, manage, and track your positions with confidence. Built for speed and clarity, optimized for all devices." | **Section Description** |
| 278-279 | Learn More Button    | "Learn More"                                                                                                                                                                               | **Button Text**         |

---

## Remove Liquidity Page (`/removeLp`)

**File:** `src/components/Converter1.tsx`

### Content Update Areas:

| Line    | Element              | Current Content                                                                                                                                                                           | Update Type             |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 250-253 | Main Title           | "Pool Exchange with DEX."                                                                                                                                                                 | **Main Title**          |
| 254-259 | Description          | "At our cryptocurrency token exchange platform, we offer an easy-to-use token swap service that allows you to seamlessly exchange one type of token for another with maximum efficiency." | **Description**         |
| 271-272 | Back Button          | "Back"                                                                                                                                                                                    | **Button Text**         |
| 275-277 | Section Title        | "Remove WPOL/USDC Liquidity"                                                                                                                                                              | **Section Title**       |
| 278-280 | Subtitle             | "To Receive WPOL and USDC"                                                                                                                                                                | **Subtitle**            |
| 284-286 | Input Label          | "Position Token ID"                                                                                                                                                                       | **Input Label**         |
| 289     | Input Placeholder    | "Enter Position Token ID"                                                                                                                                                                 | **Input Placeholder**   |
| 301-302 | Amount Label         | "Amount to Remove"                                                                                                                                                                        | **Label Text**          |
| 374-376 | Receive Label        | "You will Receive"                                                                                                                                                                        | **Label Text**          |
| 444-446 | Prices Label         | "Current Prices:"                                                                                                                                                                         | **Label Text**          |
| 450-451 | Price Label          | "1 WPOL ="                                                                                                                                                                                | **Price Label**         |
| 461-462 | Price Label          | "1 USDC ="                                                                                                                                                                                | **Price Label**         |
| 472-474 | Pool Share Label     | "Pool Share:"                                                                                                                                                                             | **Label Text**          |
| 499-501 | Position Label       | "Your Position Details"                                                                                                                                                                   | **Label Text**          |
| 512-513 | LP Label             | "WPOL/USDC LP"                                                                                                                                                                            | **Label Text**          |
| 523-524 | LP Tokens Label      | "LP Tokens:"                                                                                                                                                                              | **Label Text**          |
| 532-533 | Pool WPOL Label      | "Pool WPOL:"                                                                                                                                                                              | **Label Text**          |
| 543-544 | Pool USDC Label      | "Pool USDC:"                                                                                                                                                                              | **Label Text**          |
| 552-553 | Total Value Label    | "Total Value:"                                                                                                                                                                            | **Label Text**          |
| 562-564 | Unclaimed Fees Label | "Unclaimed Fees:"                                                                                                                                                                         | **Label Text**          |
| 592-593 | Enable Button        | "Enable"                                                                                                                                                                                  | **Button Text**         |
| 607-610 | Remove Button        | "Remove Liquidity" / "Removing..."                                                                                                                                                        | **Button Text**         |
| 616-619 | Status Message       | "✅ Position enabled. You can now remove liquidity."                                                                                                                                      | **Status Message**      |
| 625-629 | Section Title        | "How Pool Exchange Works"                                                                                                                                                                 | **Section Title**       |
| 630-635 | Section Description  | "Remove liquidity with confidence. Dextrend guides you every step with clear controls, helpful context, and fast execution designed for professional traders and newcomers alike."        | **Section Description** |
| 641-642 | Learn More Button    | "Learn More"                                                                                                                                                                              | **Button Text**         |

---

## Shared Components

### JoinCommunity Component

**File:** `src/components/JoinCommunity.tsx`

| Line | Element     | Current Content      | Update Type     |
| ---- | ----------- | -------------------- | --------------- |
| 10   | Button Text | "Join our community" | **Button Text** |

### WalletButton Component

**File:** `src/components/WalletButton.tsx`

| Line    | Element                  | Current Content                                    | Update Type      |
| ------- | ------------------------ | -------------------------------------------------- | ---------------- |
| 32-34   | Modal Title              | "Connect Wallet"                                   | **Modal Title**  |
| 66-69   | MetaMask Description     | "Connect using MetaMask wallet"                    | **Description**  |
| 96-99   | Trust Wallet Description | "Connect using Trust Wallet"                       | **Description**  |
| 110-111 | Terms Text               | "By connecting, you agree to our Terms of Service" | **Terms Text**   |
| 112-114 | Network Text             | "Will automatically switch to Polygon network"     | **Network Text** |

---

## Summary of Update Types

### **High Priority Updates:**

1. **Main Titles** - All pages have similar "Pool Exchange with DEX" titles that should be customized per page
2. **Descriptions** - Generic descriptions need to be page-specific
3. **Section Titles** - "How Pool Exchange Works" appears on multiple pages
4. **Button Text** - Generic "Learn More" buttons need specific actions

### **Medium Priority Updates:**

1. **Feature Cards** - Home page feature cards need relevant content
2. **Statistics** - Hero section stats should reflect actual metrics
3. **Form Labels** - Technical labels can be more user-friendly
4. **Status Messages** - Error/success messages can be more descriptive

### **Low Priority Updates:**

1. **Placeholder Text** - Input placeholders can be more helpful
2. **Tab Labels** - Navigation tabs can be more descriptive
3. **Tooltip Text** - Help text for complex features

---

## Notes for Content Updates

1. **Consistency**: Maintain consistent tone and terminology across all pages
2. **User-Friendly**: Replace technical jargon with user-friendly language
3. **Action-Oriented**: Make button text and CTAs more specific and actionable
4. **SEO-Friendly**: Include relevant keywords in titles and descriptions
5. **Mobile-First**: Ensure all text works well on mobile devices
6. **Accessibility**: Use clear, descriptive text for screen readers

This document provides a complete roadmap for updating all content across the DEX-Trend application. Each update location is clearly marked with the file path, line number, current content, and suggested update type.
