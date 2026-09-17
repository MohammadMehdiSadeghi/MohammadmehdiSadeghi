import React, { useEffect } from "react";

export default function SuccessModal({ isOpen, onClose, senderName, phoneNumber }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <style>{`
        @keyframes modalPop {
          0% { transform: scale(0.92) translateY(16px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 25px rgba(0, 213, 190, 0.35); }
          50% { box-shadow: 0 0 45px rgba(97, 95, 255, 0.55); }
        }
        @keyframes iconBounce {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Modal Container */}
      <div
        className="relative w-full max-w-md bg-[#091122] border border-[#314158] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          animation: "modalPop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(97, 95, 255, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Laser Bar */}
        <div
          className="h-1.5 w-full"
          style={{
            background: "linear-gradient(90deg, #615FFF 0%, #00D5BE 50%, #FFB86A 100%)",
          }}
        />

        {/* Window Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B] bg-[#060D1A]/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80" />
            <span className="text-[11px] font-mono text-[#68768C] ml-2 tracking-wider uppercase">
              // status: message_dispatched
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#90A1B9] hover:text-white hover:bg-[#1E293B] flex items-center justify-center transition-colors text-[14px]"
            title="بستن (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          {/* Animated Success Badge */}
          <div className="relative mb-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#00D5BE]/20 to-[#615FFF]/20 border border-[#00D5BE]/40"
              style={{ animation: "pulseGlow 3s infinite ease-in-out" }}
            >
              <div
                className="w-14 h-14 rounded-full bg-[#00D5BE] flex items-center justify-center text-black shadow-lg"
                style={{ animation: "iconBounce 0.5s ease-out forwards" }}
              >
                <svg
                  className="w-8 h-8 text-[#020618]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            {/* Sparkle badge */}
            <span className="absolute -bottom-1 -right-1 text-base">✨</span>
          </div>

          {/* Heading */}
          <h3 className="text-white text-[20px] sm:text-[22px] font-bold mb-2">
            پیام شما با موفقیت دریافت شد!
          </h3>

          <p className="text-[13px] text-[#A5B4FC] font-mono mb-4">
            Thank you {senderName ? `${senderName}` : ""}! Message received.
          </p>

          {/* Persian Friendly Message */}
          <div className="bg-[#020618]/70 border border-[#1E293B] rounded-xl p-4 w-full text-right mb-6">
            <p className="text-[13px] sm:text-[14px] text-[#CBD5E1] leading-7" dir="rtl">
              {senderName ? `${senderName} عزیز، ` : ""}
              پیام شما با موفقیت در سیستم ثبت شد. به زودی متن درخواست شما را بررسی می‌کنم و در اسرع وقت
              {phoneNumber ? ` از طریق شماره ${phoneNumber}` : " با شما"} تماس خواهم گرفت.
            </p>

            <div className="mt-3 pt-3 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-[#68768C]">
              <span className="font-mono text-[#00D5BE]">✓ Delivery Confirmed</span>
              <span>پاسخگویی سریع</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full py-3 px-6 rounded-xl font-medium text-[14px] text-white transition-all duration-200
              bg-gradient-to-r from-[#615FFF] to-[#4F46E5] hover:from-[#7573FF] hover:to-[#5B54F6]
              shadow-[0_4px_20px_rgba(97,95,255,0.4)] hover:shadow-[0_6px_25px_rgba(97,95,255,0.6)]
              active:scale-[0.98] cursor-pointer"
          >
            متوجه شدم (بستن)
          </button>
        </div>
      </div>
    </div>
  );
}
