const StartInSecondsSection = () => (
    <section className="lg:py-[150px] md:py-[100px] py-[50px]">
        <div className="w-full max-w-[1050px] mx-auto px-4">
            <div className="flex md:items-start items-center justify-between gap-5 md:flex-row flex-col">
                <div className="">
                    <img
                        className="w-full md:max-w-max max-w-[200px]"
                        src="./images/mobile.png"
                        alt=""
                    />
                </div>
                <div className="lg:pt-[100px]">
                    <h2 className="md:text-[64px] text-[38px] font-medium text-[#DC2626]">
                        Start <br className="md:block hidden" />
                        in <span className="text-[#B91C1C]">Seconds</span>
                    </h2>
                    <p className="md:text-[22px] text-sm font-normal text-[#DC2626] md:mt-[54px] mt-[20px] md:mb-[32px] mb-[20px]">
                        Connect your crypto wallet to start using in seconds.
                    </p>
                    <p className="md:text-[22px] text-sm font-normal text-[#DC2626]">
                        No registration needed.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 text-center max-w-[320px] md:mt-[54px] mt-[20px]">
                        <a
                            href="#"
                            className="bg-[#DC2626] border-[2px] border-transparent text-white md:text-base text-sm font-medium rounded-[33px] p-3"
                        >
                            Buy CFNC
                        </a>
                        <a
                            href="#"
                            className="bg-transparent border-[2px] border-[#E9E9E9] text-[#000000] md:text-base text-sm font-medium rounded-[33px] p-3"
                        >
                            Learn More
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>
)

export default StartInSecondsSection
