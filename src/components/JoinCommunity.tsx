const JoinCommunity = () => {
    return (
        <a
            href="https://t.me/NCOG_Earth"
            target="_blank"
            aria-label="Join our community"
            className="flex cursor-pointer items-center gap-4 text-black font-normal text-[14.29px] leading-[15.84px] bg-white border border-[#eaeaea] rounded-full px-[15px] py-2 mb-5 transition"
        >
            <span>⚡</span>
            <span>Join our community</span>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                fill="none"
            >
                <g clip-path="url(#a)">
                    <g clip-path="url(#b)">
                        <g clip-path="url(#c)">
                            <path
                                stroke="#767676"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width=".9"
                                d="M1.176 6.31h10.8m0 0-5.1-5.1m5.1 5.1-5.1 5.1"
                            />
                        </g>
                    </g>
                </g>
                <defs>
                    <clipPath id="a">
                        <path fill="#fff" d="M.28.31h12.59v12H.28z" />
                    </clipPath>
                    <clipPath id="b">
                        <path fill="#fff" d="M.28.31h12.59v12H.28z" />
                    </clipPath>
                    <clipPath id="c">
                        <path fill="#fff" d="M.275.31h12.6v12H.275z" />
                    </clipPath>
                </defs>
            </svg>
        </a>
    )
}

export default JoinCommunity
