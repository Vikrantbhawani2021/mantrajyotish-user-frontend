import React from "react";
import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function InsufficientBalanceModal({ open, onClose, message }) {
  const navigate = useNavigate();
  if (!open) return null;

  const handleGoToWallet = () => {
    onClose();
    navigate("/wallet");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative bg-white w-full max-w-[430px] rounded-t-[28px] p-6 pb-8 shadow-2xl animate-slide-up">
        <div className="w-12 h-1 bg-gray-200 rounded-full mb-4 mx-auto"></div>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
            <Wallet size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Insufficient Wallet Balance</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleGoToWallet}
            className="w-full bg-[#ff7448] text-white py-3 rounded-2xl font-bold"
          >
            Add Money
          </button>

          <button
            onClick={onClose}
            className="w-full bg-gray-50 text-gray-700 py-3 rounded-2xl font-bold border border-gray-200"
          >
            Continue Browsing
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
