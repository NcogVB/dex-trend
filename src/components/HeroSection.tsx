import JoinCommunity from './JoinCommunity'
import WalletButton from './WalletButton'

const HeroSection = () => (
    <div className="hero-section">
        <div className="flex-grow flex flex-col items-center md:px-6 px-4 pt-[40px] md:pt-[88px] container mx-auto w-full">
            <JoinCommunity />
            <h1 className="font-semibold text-[40px] leading-[48px] md:text-[80px] md:leading-[88px] align-middle capitalize mb-3 text-[#2563EB] max-w-[620px] text-center mx-auto">
                <span className="text-[#2563EB]"> Token </span> Swap With
                Efficiency.
            </h1>
            <p className="text-center font-normal md:text-[17.72px] md:leading-7 text-[#767676] max-w-[700px] mb-6">
                At our cryptocurrency token exchange platform, we offer an
                easy-to-use token swap service that allows you to seamlessly
                exchange one type of token for another with maximum efficiency.
            </p>
            <WalletButton />
            <div className="modern-card mt-[105px] mb-[191px] w-full">
                <div className="flex flex-col gap-[25px] md:gap-[40px] w-full px-[20px] md:px-[40px] py-[30px] md:py-[40px]">
                    <div className='w-full flex md:flex justify-between items-center gap-[25px] md:gap-[51px]">'>
                        <div className="flex-1 w-full">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <label className="text-[#000000] font-bold text-2xl leading-[100%]">
                                        From
                                    </label>
                                    <div className="relative min-w-[133px]">
                                        <button
                                            aria-expanded="false"
                                            aria-haspopup="listbox"
                                            className="token-button bg-[#FFFFFF66] border rounded-xl border-solid border-[#FFFFFF1A] px-2 py-2 w-full flex items-center cursor-pointer select-none"
                                            type="button"
                                        >
                                            <img
                                                src="https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg"
                                                className="token-img rounded-full shadow-[0px_6px_10px_0px_#00000013] size-[26px] min-w-[26px]"
                                                alt=""
                                            />
                                            <span className="token-label text-[13px] font-normal text-black flex-grow ml-1.5 mr-4">
                                                Polygin Mainnet
                                            </span>
                                            <svg
                                                className="token-arrow"
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="15"
                                                height="7"
                                                fill="none"
                                            >
                                                <path
                                                    fill="#000"
                                                    d="M7 7a1 1 0 0 1-.64-.23l-6-5A1.001 1.001 0 0 1 1.64.23L7 4.71 12.36.39a1 1 0 0 1 1.41.15A1 1 0 0 1 13.63 2l-6 4.83A1 1 0 0 1 7 7Z"
                                                />
                                            </svg>
                                        </button>
                                        <ul
                                            className="token-list absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-auto ring-1 ring-black ring-opacity-5 hidden text-[13px] font-normal text-black"
                                            role="listbox"
                                            tabIndex={-1}
                                        >
                                            <li
                                                className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center"
                                                data-color="#00B67A"
                                                data-img="./images/stock-2.png"
                                                data-token="USDT"
                                                role="option"
                                                tabIndex={0}
                                            >
                                                <img
                                                    alt=""
                                                    className="w-6 h-6 mr-2"
                                                    height="24"
                                                    src="./images/stock-2.png"
                                                    width="24"
                                                />
                                                USDC
                                            </li>
                                            <li
                                                className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center"
                                                data-color="#F7931A"
                                                data-img="https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg"
                                                data-token="Ethereum Mainnet"
                                                role="option"
                                                tabIndex={-1}
                                            >
                                                <img
                                                    alt=""
                                                    className="w-6 h-6 mr-2"
                                                    height="24"
                                                    src="https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg"
                                                    width="24"
                                                />
                                                Polygon Mainnet
                                            </li>
                                            <li
                                                className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center"
                                                data-color="#3B3B3B"
                                                data-img="./images/stock-1.svg "
                                                data-token="BNB Chain"
                                                role="option"
                                                tabIndex={-1}
                                            >
                                                <img
                                                    alt=""
                                                    className="w-6 h-6 mr-2"
                                                    height="24"
                                                    src="./images/stock-1.svg "
                                                    width="24"
                                                />
                                                Arbitrum Chain
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <button>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        fill="none"
                                    >
                                        <path
                                            fill="#000"
                                            fill-rule="evenodd"
                                            d="M18.628 6.285A2.654 2.654 0 0 1 20 8.607v5.727c0 .965-.525 1.854-1.372 2.322l-5.333 2.95a2.676 2.676 0 0 1-2.59 0l-5.333-2.95A2.654 2.654 0 0 1 4 14.334V8.607c0-.965.525-1.853 1.372-2.322l5.333-2.95a2.676 2.676 0 0 1 2.59 0l5.333 2.95Zm-8.406 5.185c0-.978.796-1.77 1.778-1.77s1.778.793 1.778 1.77c0 .978-.796 1.77-1.778 1.77a1.774 1.774 0 0 1-1.778-1.77ZM12 7.93a3.548 3.548 0 0 0-3.556 3.54A3.548 3.548 0 0 0 12 15.011a3.548 3.548 0 0 0 3.556-3.54A3.548 3.548 0 0 0 12 7.928Z"
                                            clip-rule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <div className="modern-input px-[16px] py-[16px]">
                                <div className="flex items-center justify-between font-normal text-sm leading-[18.86px] text-[#888888] mb-3">
                                    <span>Send:</span>
                                    <span className="underline">Max: 0</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[#333333] font-semibold text-[20px] leading-[31.43px]">
                                        0
                                    </p>
                                    <div className="relative min-w-[95px]">
                                        <button
                                            aria-expanded="false"
                                            aria-haspopup="listbox"
                                            className="token-button w-full flex items-center cursor-pointer select-none"
                                            type="button"
                                        >
                                            <img
                                                className="token-img rounded-full shadow-[0px_6px_10px_0px_#00000013] size-[23px] min-w-[23px]"
                                                alt=""
                                                src="./images/stock-2.png"
                                            />
                                            <span className="token-label text-[#000000] text-[16px] font-normal text-left flex-grow ml-3 mr-8">
                                                USDC
                                            </span>
                                            <svg
                                                className="token-arrow"
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="15"
                                                height="7"
                                                fill="none"
                                            >
                                                <path
                                                    fill="#000"
                                                    d="M7 7a1 1 0 0 1-.64-.23l-6-5A1.001 1.001 0 0 1 1.64.23L7 4.71 12.36.39a1 1 0 0 1 1.41.15A1 1 0 0 1 13.63 2l-6 4.83A1 1 0 0 1 7 7Z"
                                                />
                                            </svg>
                                        </button>
                                        <ul
                                            className="token-list absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-auto ring-1 ring-black ring-opacity-5 hidden text-[13px] font-normal text-black"
                                            role="listbox"
                                            tabIndex={-1}
                                        >
                                            <li
                                                className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center"
                                                data-color="#00B67A"
                                                data-img="./images/stock-2.png"
                                                data-token="USDT"
                                                role="option"
                                                tabIndex={0}
                                            >
                                                <img
                                                    alt="Indian Rupee symbol icon representing USDT token"
                                                    className="w-6 h-6 mr-2"
                                                    height="24"
                                                    src="./images/stock-2.png"
                                                    width="24"
                                                />
                                                USDT
                                            </li>
                                            <li
                                                className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center"
                                                data-color="#F7931A"
                                                data-img="https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg"
                                                data-token="BTC"
                                                role="option"
                                                tabIndex={-1}
                                            >
                                                <img
                                                    alt=""
                                                    className="w-6 h-6 mr-2"
                                                    height="24"
                                                    src="https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg"
                                                    width="24"
                                                />
                                                BTC
                                            </li>
                                            <li
                                                className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center"
                                                data-color="#3B3B3B"
                                                data-img="./images/stock-1.svg "
                                                data-token="ETH"
                                                role="option"
                                                tabIndex={-1}
                                            >
                                                <img
                                                    alt=""
                                                    className="w-6 h-6 mr-2"
                                                    height="24"
                                                    src="./images/stock-1.svg "
                                                    width="24"
                                                />
                                                ETH
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="28"
                                height="29"
                                fill="none"
                            >
                                <path
                                    fill="#000"
                                    d="M19.876.5H8.138C3.04.5 0 3.538 0 8.634v11.718c0 5.11 3.04 8.148 8.138 8.148h11.724C24.96 28.5 28 25.462 28 20.366V8.634C28.014 3.538 24.974.5 19.876.5Zm-7.284 21c0 .14-.028.266-.084.406a1.095 1.095 0 0 1-.574.574 1.005 1.005 0 0 1-.406.084 1.056 1.056 0 0 1-.743-.308l-4.132-4.13a1.056 1.056 0 0 1 0-1.484 1.057 1.057 0 0 1 1.485 0l2.34 2.338V7.5c0-.574.476-1.05 1.05-1.05.574 0 1.064.476 1.064 1.05v14Zm8.755-9.128a1.04 1.04 0 0 1-.743.308 1.04 1.04 0 0 1-.742-.308l-2.34-2.338V21.5c0 .574-.475 1.05-1.05 1.05-.574 0-1.05-.476-1.05-1.05v-14c0-.14.028-.266.084-.406.112-.252.308-.462.574-.574a.99.99 0 0 1 .798 0c.127.056.238.126.337.224l4.132 4.13c.406.42.406 1.092 0 1.498Z"
                                />
                            </svg>
                        </div>
                        <div className="flex-1 w-full">
                            <div className="flex items-center gap-2.5 mb-3">
                                <label className="text-[#000000] font-bold text-2xl leading-[100%]">
                                    To
                                </label>
                                <div className="relative min-w-[133px]">
                                    <button
                                        aria-expanded="false"
                                        aria-haspopup="listbox"
                                        className="token-button bg-[#FFFFFF66] border rounded-xl border-solid border-[#FFFFFF1A] px-2 py-2 w-full flex items-center cursor-pointer select-none"
                                        type="button"
                                    >
                                        <img
                                            className="token-img rounded-full shadow-[0px_6px_10px_0px_#00000013] size-[26px] min-w-[26px]"
                                            alt=""
                                            src="./images/stock-1.svg"
                                        />

                                        <span className="token-label text-[13px] font-normal text-black flex-grow ml-1.5 mr-4">
                                            Arbitrum Chain
                                        </span>

                                        <svg
                                            className="token-arrow"
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="15"
                                            height="7"
                                            fill="none"
                                        >
                                            <path
                                                fill="#000"
                                                d="M7 7a1 1 0 0 1-.64-.23l-6-5A1.001 1.001 0 0 1 1.64.23L7 4.71 12.36.39a1 1 0 0 1 1.41.15A1 1 0 0 1 13.63 2l-6 4.83A1 1 0 0 1 7 7Z"
                                            />
                                        </svg>
                                    </button>
                                    <ul
                                        className="token-list absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-48 overflow-auto ring-1 ring-black ring-opacity-5 hidden text-[13px] font-normal text-black"
                                        role="listbox"
                                        tabIndex={-1}
                                    >
                                        <li
                                            className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center"
                                            data-color="#00B67A"
                                            data-img="./images/stock-2.png"
                                            data-token="USDT"
                                            role="option"
                                            tabIndex={0}
                                        >
                                            <img
                                                alt="Indian Rupee symbol icon representing USDT token"
                                                className="w-6 h-6 mr-2"
                                                height="24"
                                                src="./images/stock-2.png"
                                                width="24"
                                            />
                                            USDT
                                        </li>
                                        <li
                                            className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center"
                                            data-color="#F7931A"
                                            data-img="https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg"
                                            data-token="Ethereum Mainnet"
                                            role="option"
                                            tabIndex={-1}
                                        >
                                            <img
                                                alt=""
                                                className="w-6 h-6 mr-2"
                                                height="24"
                                                src="https://storage.googleapis.com/a1aa/image/6d94bf53-1009-4e09-cc33-08da0b192de7.jpg"
                                                width="24"
                                            />
                                            Polygon Mainnet
                                        </li>
                                        <li
                                            className="token-item cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center"
                                            data-color="#3B3B3B"
                                            data-img="./images/stock-1.svg "
                                            data-token="ETH"
                                            role="option"
                                            tabIndex={-1}
                                        >
                                            <img
                                                alt=""
                                                className="w-6 h-6 mr-2"
                                                height="24"
                                                src="./images/stock-1.svg "
                                                width="24"
                                            />
                                            Arbitrum Chain
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="modern-input px-[16px] py-[16px]">
                                <div className="flex items-center justify-between font-normal text-sm leading-[18.86px] text-[#888888] mb-3">
                                    <span>Receive (estimated):</span>
                                </div>
                                <p className="text-[#333333] font-semibold text-[20px] leading-[31.43px]">
                                   0
                                </p>
                            </div>
                        </div>
                    </div>

                    <button className="modern-button w-full p-[16px] text-center text-base font-semibold">
                        Exchange
                    </button>

                    {/* <div className="absolute flex items-end gap-2 space-y-4 xl:left-[-73px] left-0 md:top-[-90px] top-[-100px] w-full justify-between">
                        <div className="bg-[#FFFFFF80] rounded-[15px] shadow-md p-3 max-w-[280px] text-[11px] text-black flex flex-col space-y-1">
                            <div className="flex items-center justify-between text-[12px] font-semibold">
                                <div className="flex items-center gap-1">
                                    <svg
                                        width="17"
                                        height="11"
                                        viewBox="0 0 17 11"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M11.4493 5.07875C10.2288 5.19732 9.17537 5.58731 8.5 6.52212C7.82463 5.58731 6.77124 5.19732 5.5507 5.07875C3.60426 4.88963 1.39059 4.78969 0 3.8588C1.43238 6.50939 0.657883 9.73909 4.78301 10.8611C5.86458 11.155 6.99863 10.9649 7.99857 10.4564C8.14919 10.3799 8.32022 10.3368 8.5 10.3368C8.67978 10.3368 8.85081 10.3799 9.00143 10.4564C10.0014 10.9649 11.1354 11.155 12.217 10.8611C16.3421 9.73909 15.5676 6.50939 17 3.8588C15.6094 4.78969 13.3957 4.88963 11.4493 5.07875ZM3.72865 8.46818C3.22236 8.02331 2.97165 7.40892 2.71024 6.51233C3.39436 6.61129 4.08237 6.67401 4.74025 6.73378C4.95793 6.75338 5.17366 6.77297 5.38648 6.79355C6.60506 6.91212 7.53212 7.90768 7.57974 9.12764C6.70321 8.87679 4.85686 7.9116 4.85686 7.9116C5.55945 8.80526 7.58168 9.52351 7.58168 9.52351C5.72076 9.4363 4.42735 9.08257 3.72865 8.4672V8.46818ZM13.2714 8.46818C12.5727 9.08354 11.2783 9.43728 9.41831 9.52449C9.41831 9.52449 11.4406 8.80722 12.1431 7.91258C12.1431 7.91258 10.2968 8.87679 9.42026 9.12862C9.46787 7.90768 10.3949 6.91212 11.6135 6.79453C11.8263 6.77395 12.0421 6.75436 12.2597 6.73476C12.9176 6.67499 13.6056 6.61227 14.2898 6.51331C14.0284 7.4099 13.7776 8.02429 13.2714 8.46916V8.46818Z"
                                            fill="url(#paint0_linear_2009_12687)"
                                        />
                                        <path
                                            d="M4.92821 4.63584C5.07786 4.64956 5.22556 4.66327 5.37327 4.67699V4.50159C5.37327 2.7623 6.7765 1.34832 8.5004 1.34832C10.2243 1.34832 11.6275 2.76328 11.6275 4.50159V4.67699C11.7752 4.66327 11.9229 4.64956 12.0726 4.63584C12.37 4.6084 12.6683 4.58194 12.9656 4.55157V4.50159C12.9656 2.01562 10.9667 0 8.5004 0C6.03407 0 4.03516 2.01562 4.03516 4.50257V4.55255C4.33252 4.58292 4.63085 4.61036 4.92821 4.63682V4.63584Z"
                                            fill="#161616"
                                        />
                                        <defs>
                                            <linearGradient
                                                id="paint0_linear_2009_12687"
                                                x1="8.5"
                                                y1="11.1266"
                                                x2="8.5"
                                                y2="3.9656"
                                                gradientUnits="userSpaceOnUse"
                                            >
                                                <stop stop-color="#006837" />
                                                <stop
                                                    offset="1"
                                                    stop-color="#39B54A"
                                                />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <span>Header goes here</span>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    1h ago
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-600 leading-tight">
                                This will be a descriptive text or an amount
                                that the user have widthdrawn
                            </p>
                        </div>
                        <div className="bg-[#FFFFFF80] rounded-[15px] shadow-md p-3 max-w-[280px] text-[11px] text-black flex flex-col space-y-1">
                            <div className="flex items-center justify-between text-[12px] font-semibold">
                                <div className="flex items-center gap-1">
                                    <svg
                                        width="17"
                                        height="11"
                                        viewBox="0 0 17 11"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M11.4493 5.07875C10.2288 5.19732 9.17537 5.58731 8.5 6.52212C7.82463 5.58731 6.77124 5.19732 5.5507 5.07875C3.60426 4.88963 1.39059 4.78969 0 3.8588C1.43238 6.50939 0.657883 9.73909 4.78301 10.8611C5.86458 11.155 6.99863 10.9649 7.99857 10.4564C8.14919 10.3799 8.32022 10.3368 8.5 10.3368C8.67978 10.3368 8.85081 10.3799 9.00143 10.4564C10.0014 10.9649 11.1354 11.155 12.217 10.8611C16.3421 9.73909 15.5676 6.50939 17 3.8588C15.6094 4.78969 13.3957 4.88963 11.4493 5.07875ZM3.72865 8.46818C3.22236 8.02331 2.97165 7.40892 2.71024 6.51233C3.39436 6.61129 4.08237 6.67401 4.74025 6.73378C4.95793 6.75338 5.17366 6.77297 5.38648 6.79355C6.60506 6.91212 7.53212 7.90768 7.57974 9.12764C6.70321 8.87679 4.85686 7.9116 4.85686 7.9116C5.55945 8.80526 7.58168 9.52351 7.58168 9.52351C5.72076 9.4363 4.42735 9.08257 3.72865 8.4672V8.46818ZM13.2714 8.46818C12.5727 9.08354 11.2783 9.43728 9.41831 9.52449C9.41831 9.52449 11.4406 8.80722 12.1431 7.91258C12.1431 7.91258 10.2968 8.87679 9.42026 9.12862C9.46787 7.90768 10.3949 6.91212 11.6135 6.79453C11.8263 6.77395 12.0421 6.75436 12.2597 6.73476C12.9176 6.67499 13.6056 6.61227 14.2898 6.51331C14.0284 7.4099 13.7776 8.02429 13.2714 8.46916V8.46818Z"
                                            fill="url(#paint0_linear_2009_12687)"
                                        />
                                        <path
                                            d="M4.92821 4.63584C5.07786 4.64956 5.22556 4.66327 5.37327 4.67699V4.50159C5.37327 2.7623 6.7765 1.34832 8.5004 1.34832C10.2243 1.34832 11.6275 2.76328 11.6275 4.50159V4.67699C11.7752 4.66327 11.9229 4.64956 12.0726 4.63584C12.37 4.6084 12.6683 4.58194 12.9656 4.55157V4.50159C12.9656 2.01562 10.9667 0 8.5004 0C6.03407 0 4.03516 2.01562 4.03516 4.50257V4.55255C4.33252 4.58292 4.63085 4.61036 4.92821 4.63682V4.63584Z"
                                            fill="#161616"
                                        />
                                        <defs>
                                            <linearGradient
                                                id="paint0_linear_2009_12687"
                                                x1="8.5"
                                                y1="11.1266"
                                                x2="8.5"
                                                y2="3.9656"
                                                gradientUnits="userSpaceOnUse"
                                            >
                                                <stop stop-color="#006837" />
                                                <stop
                                                    offset="1"
                                                    stop-color="#39B54A"
                                                />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <span>Header goes here</span>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    1h ago
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-600 leading-tight">
                                This will be a descriptive text or an amount
                                that the user have widthdrawn
                            </p>
                        </div>
                    </div>
                    <div className="absolute flex items-start gap-2 space-y-4 w-full justify-between md:left-[25px] 2xl:left-[58px] bottom-[-85px]">
                        <div className="bg-[#FFFFFF80] rounded-[15px] shadow-md p-3 max-w-[280px] text-[11px] text-black flex flex-col space-y-1 md:mt-[29px] mt-[16px]">
                            <div className="flex items-center justify-between text-[12px] font-semibold">
                                <div className="flex items-center gap-1">
                                    <svg
                                        width="17"
                                        height="11"
                                        viewBox="0 0 17 11"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M11.4493 5.07875C10.2288 5.19732 9.17537 5.58731 8.5 6.52212C7.82463 5.58731 6.77124 5.19732 5.5507 5.07875C3.60426 4.88963 1.39059 4.78969 0 3.8588C1.43238 6.50939 0.657883 9.73909 4.78301 10.8611C5.86458 11.155 6.99863 10.9649 7.99857 10.4564C8.14919 10.3799 8.32022 10.3368 8.5 10.3368C8.67978 10.3368 8.85081 10.3799 9.00143 10.4564C10.0014 10.9649 11.1354 11.155 12.217 10.8611C16.3421 9.73909 15.5676 6.50939 17 3.8588C15.6094 4.78969 13.3957 4.88963 11.4493 5.07875ZM3.72865 8.46818C3.22236 8.02331 2.97165 7.40892 2.71024 6.51233C3.39436 6.61129 4.08237 6.67401 4.74025 6.73378C4.95793 6.75338 5.17366 6.77297 5.38648 6.79355C6.60506 6.91212 7.53212 7.90768 7.57974 9.12764C6.70321 8.87679 4.85686 7.9116 4.85686 7.9116C5.55945 8.80526 7.58168 9.52351 7.58168 9.52351C5.72076 9.4363 4.42735 9.08257 3.72865 8.4672V8.46818ZM13.2714 8.46818C12.5727 9.08354 11.2783 9.43728 9.41831 9.52449C9.41831 9.52449 11.4406 8.80722 12.1431 7.91258C12.1431 7.91258 10.2968 8.87679 9.42026 9.12862C9.46787 7.90768 10.3949 6.91212 11.6135 6.79453C11.8263 6.77395 12.0421 6.75436 12.2597 6.73476C12.9176 6.67499 13.6056 6.61227 14.2898 6.51331C14.0284 7.4099 13.7776 8.02429 13.2714 8.46916V8.46818Z"
                                            fill="url(#paint0_linear_2009_12687)"
                                        />
                                        <path
                                            d="M4.92821 4.63584C5.07786 4.64956 5.22556 4.66327 5.37327 4.67699V4.50159C5.37327 2.7623 6.7765 1.34832 8.5004 1.34832C10.2243 1.34832 11.6275 2.76328 11.6275 4.50159V4.67699C11.7752 4.66327 11.9229 4.64956 12.0726 4.63584C12.37 4.6084 12.6683 4.58194 12.9656 4.55157V4.50159C12.9656 2.01562 10.9667 0 8.5004 0C6.03407 0 4.03516 2.01562 4.03516 4.50257V4.55255C4.33252 4.58292 4.63085 4.61036 4.92821 4.63682V4.63584Z"
                                            fill="#161616"
                                        />
                                        <defs>
                                            <linearGradient
                                                id="paint0_linear_2009_12687"
                                                x1="8.5"
                                                y1="11.1266"
                                                x2="8.5"
                                                y2="3.9656"
                                                gradientUnits="userSpaceOnUse"
                                            >
                                                <stop stop-color="#006837" />
                                                <stop
                                                    offset="1"
                                                    stop-color="#39B54A"
                                                />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <span>Header goes here</span>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    1h ago
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-600 leading-tight">
                                This will be a descriptive text or an amount
                                that the user have widthdrawn
                            </p>
                        </div>
                        <div className="bg-[#FFFFFF80] rounded-[15px] shadow-md p-3 max-w-[280px] text-[11px] text-black flex flex-col space-y-1">
                            <div className="flex items-center justify-between text-[12px] font-semibold">
                                <div className="flex items-center gap-1">
                                    <svg
                                        width="17"
                                        height="11"
                                        viewBox="0 0 17 11"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M11.4493 5.07875C10.2288 5.19732 9.17537 5.58731 8.5 6.52212C7.82463 5.58731 6.77124 5.19732 5.5507 5.07875C3.60426 4.88963 1.39059 4.78969 0 3.8588C1.43238 6.50939 0.657883 9.73909 4.78301 10.8611C5.86458 11.155 6.99863 10.9649 7.99857 10.4564C8.14919 10.3799 8.32022 10.3368 8.5 10.3368C8.67978 10.3368 8.85081 10.3799 9.00143 10.4564C10.0014 10.9649 11.1354 11.155 12.217 10.8611C16.3421 9.73909 15.5676 6.50939 17 3.8588C15.6094 4.78969 13.3957 4.88963 11.4493 5.07875ZM3.72865 8.46818C3.22236 8.02331 2.97165 7.40892 2.71024 6.51233C3.39436 6.61129 4.08237 6.67401 4.74025 6.73378C4.95793 6.75338 5.17366 6.77297 5.38648 6.79355C6.60506 6.91212 7.53212 7.90768 7.57974 9.12764C6.70321 8.87679 4.85686 7.9116 4.85686 7.9116C5.55945 8.80526 7.58168 9.52351 7.58168 9.52351C5.72076 9.4363 4.42735 9.08257 3.72865 8.4672V8.46818ZM13.2714 8.46818C12.5727 9.08354 11.2783 9.43728 9.41831 9.52449C9.41831 9.52449 11.4406 8.80722 12.1431 7.91258C12.1431 7.91258 10.2968 8.87679 9.42026 9.12862C9.46787 7.90768 10.3949 6.91212 11.6135 6.79453C11.8263 6.77395 12.0421 6.75436 12.2597 6.73476C12.9176 6.67499 13.6056 6.61227 14.2898 6.51331C14.0284 7.4099 13.7776 8.02429 13.2714 8.46916V8.46818Z"
                                            fill="url(#paint0_linear_2009_12687)"
                                        />
                                        <path
                                            d="M4.92821 4.63584C5.07786 4.64956 5.22556 4.66327 5.37327 4.67699V4.50159C5.37327 2.7623 6.7765 1.34832 8.5004 1.34832C10.2243 1.34832 11.6275 2.76328 11.6275 4.50159V4.67699C11.7752 4.66327 11.9229 4.64956 12.0726 4.63584C12.37 4.6084 12.6683 4.58194 12.9656 4.55157V4.50159C12.9656 2.01562 10.9667 0 8.5004 0C6.03407 0 4.03516 2.01562 4.03516 4.50257V4.55255C4.33252 4.58292 4.63085 4.61036 4.92821 4.63682V4.63584Z"
                                            fill="#161616"
                                        />
                                        <defs>
                                            <linearGradient
                                                id="paint0_linear_2009_12687"
                                                x1="8.5"
                                                y1="11.1266"
                                                x2="8.5"
                                                y2="3.9656"
                                                gradientUnits="userSpaceOnUse"
                                            >
                                                <stop stop-color="#006837" />
                                                <stop
                                                    offset="1"
                                                    stop-color="#39B54A"
                                                />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <span>Header goes here</span>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    1h ago
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-600 leading-tight">
                                This will be a descriptive text or an amount
                                that the user have widthdrawn
                            </p>
                        </div>
                    </div> */}
                </div>
            </div>
        </div>
    </div>
)

export default HeroSection
