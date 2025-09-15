import { Search, Send } from 'lucide-react'
import { useState } from 'react'

const AskExpertsSection = () => {
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // Telegram Bot Configuration
    const TELEGRAM_BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN as string // Replace with your bot token
    const TELEGRAM_CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID as string // Replace with your chat ID or channel ID

    const sendToTelegram = async (messageText: string) => {
        if (!messageText.trim()) {
            return
        }
        setIsLoading(true)

        try {
            const telegramMessage = `🔔 New Expert Query\n\n📝 Message: ${messageText}\n⏰ Time: ${new Date().toLocaleString()}`

            const response = await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: telegramMessage,
                        parse_mode: 'HTML',
                    }),
                }
            )

            const result = await response.json()

            if (result.ok) {
                setMessage('')
            } else {
                console.error('Telegram API error:', result)
            }
        } catch (error) {
            console.error('Error sending to Telegram:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendToTelegram(message)
        }
    }

    return (
        <section className="md:py-[140px] py-[50px] px-4">
            <h2 className="font-semibold text-[37px] md:leading-[77px] md:text-[80px] text-center text-[#2563EB] max-w-[740px] mx-auto whitespace-pre-line mb-[54px]">
                Ask Anything.{' '}
                <span className="text-[#2563EB]">From our Experts.</span>
            </h2>

            <div className="max-w-[670px] mx-auto">
                <div className="bg-white shadow-[4px_24px_60px_0px_#006D5A40] border-2 border-[#2563EB] md:rounded-[20px] rounded-[12px] py-[16px] px-[25px] flex items-center gap-3">
                    <button className="text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                        <Search />
                    </button>

                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your crypto question here..."
                        className="w-full bg-transparent focus:outline-none text-[14px] leading-[26px] text-[#767676] placeholder:text-[#767676]"
                        disabled={isLoading}
                    />

                    <button
                        onClick={() => sendToTelegram(message)}
                        disabled={isLoading || !message.trim()}
                        className="text-[#2563EB] hover:text-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Send />
                        )}
                    </button>
                </div>
            </div>

            <p className="font-normal text-[14px] leading-[26px] text-center text-[#767676] max-w-[554px] mx-auto pt-[33px]">
                Just type in your queries and send them to our experts via
                Telegram. You will get the answers of your queries in no time
                about crypto.
            </p>
        </section>
    )
}

export default AskExpertsSection
