const TrustSection = () => (
    <section>
        <div className="w-full max-w-[1500px] mx-auto px-4 relative">
            <div className="w-full max-w-[582px] mx-auto text-center xl:py-[300px] md:py-[200px]">
                <h3 className="text-lg font-medium text-[#DC2626]">
                    All in one place
                </h3>
                <h2 className="md:text-[72px] text-[48px] font-medium text-[#DC2626] md:leading-[79.2px] my-2">
                    Trust in Our{' '}
                    <span className="text-[#B91C1C]">Chief Finance</span>
                </h2>
                <p className="md:text-base text-xs font-normal text-[#767676]">
                    With its innovative features and unparalleled security
                    measures, Chief Finance is the ultimate choice for anyone
                    seeking a reliable and efficient cryptocurrency.
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-center max-w-[320px] mx-auto mt-5">
                    <a
                        href="#"
                        className="bg-[#DC2626] border-[2px] border-transparent text-white md:text-base text-sm font-medium rounded-[33px] p-4"
                    >
                        Buy CFNC
                    </a>
                    <a
                        href="#"
                        className="bg-transparent border-[2px] border-[#E9E9E9] text-[#000000] md:text-base text-sm font-medium rounded-[33px] p-4"
                    >
                        Learn More
                    </a>
                </div>
            </div>
            <img
                className="absolute top-0 left-0 w-full h-full z-[-1] md:block hidden"
                src="./images/trust-in-our.svg"
                alt=""
            />
        </div>
    </section>
)

export default TrustSection
