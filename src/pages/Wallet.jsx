import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, FileText, Tag, ChevronRight, Phone, MessageCircle, Video, RefreshCw, TrendingDown, TrendingUp, Sparkles, Wallet as WalletIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Bottomnav from "../component/Bottomnav";
import walletIllustration from "../assets/wallet.webp";
import { BACKEND_URL } from "../config/backend";
import { getBalance, getTransactions } from "../api/wallet";

const renderIcon = (type) => {
  switch (type) {
    case "plus":
      return <Plus size={16} strokeWidth={3} />;
    case "phone":
      return <Phone size={16} fill="currentColor" className="text-pink-500" />;
    case "video":
      return <Video size={16} fill="currentColor" className="text-purple-500" />;
    case "message":
      return <MessageCircle size={16} fill="currentColor" className="text-blue-500" />;
    default:
      return <TrendingDown size={16} className="text-gray-500" />;
  }
};

export default function Wallet() {
  const navigate = useNavigate();

  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem("wallet_balance");
    return saved ? parseFloat(saved) : 0;
  });

  const [txList, setTxList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getUserInfo = () => {
    let userId = null;
    let phone = localStorage.getItem("phone") || null;
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      userId = userObj._id || userObj.id || userObj.userId || null;
      if (!phone) phone = userObj.phone || null;
    } catch {}
    return { userId, phone };
  };

  const getToken = () => localStorage.getItem("authToken") || "";

  const fetchBalanceFromBackend = useCallback(async () => {
    const { userId, phone } = getUserInfo();
    const token = getToken();

    const savedLocal = parseFloat(localStorage.getItem("wallet_balance") || "0");

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const queryStr = userId ? `userId=${userId}` : phone ? `phone=${encodeURIComponent(phone)}` : "";
      const res = await getBalance(queryStr);
      if (res && res.success && res.data !== undefined) {
        const backendBal = res.data.walletBalance ?? res.data.balance ?? 0;
        const effectiveBal = Math.max(backendBal, savedLocal);
        setBalance(effectiveBal);
        localStorage.setItem("wallet_balance", effectiveBal.toFixed(2));
      } else {
        setBalance(savedLocal);
      }
    } catch (err) {
      console.error("Wallet balance fetch error:", err);
      setBalance(savedLocal);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    const { userId, phone } = getUserInfo();
    const token = getToken();

    let localTxs = [];
    try {
      const saved = localStorage.getItem("wallet_transactions");
      if (saved) localTxs = JSON.parse(saved);
    } catch {}

    if (userId || phone || token) {
      try {
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const queryStr = userId ? `userId=${userId}` : phone ? `phone=${encodeURIComponent(phone)}` : "";
        const data = await getTransactions(queryStr);
        if (data && data.success && Array.isArray(data.data)) {
          const existingIds = new Set(data.data.map(t => String(t.id)));
          const filteredLocal = localTxs.filter(t => !existingIds.has(String(t.id)));
          const merged = [...filteredLocal, ...data.data];
          merged.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
          setTxList(merged.slice(0, 25));
          return;
        }
      } catch (err) {
        console.error("Transactions fetch error:", err);
      }
    }

    setTxList(localTxs.slice(0, 25));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBalanceFromBackend(), fetchTransactions()]);
    setLoading(false);
  }, [fetchBalanceFromBackend, fetchTransactions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBalanceFromBackend(), fetchTransactions()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#FAFAFA] relative shadow-xl flex flex-col justify-between">

        {/* Scrollable Content */}
        <div className="overflow-y-auto pb-28">

          {/* Header */}
          <div className="bg-white border-b border-gray-100 flex items-center justify-between px-4 py-4 sticky top-0 z-10">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer mr-3"
              >
                <ArrowLeft size={24} className="text-gray-700" />
              </button>
              <div>
                <h1 className="text-lg font-extrabold text-[#1d2340]">My Wallet</h1>
                <p className="text-[11px] text-gray-400 font-medium">Manage your balance and transactions</p>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <RefreshCw size={18} className={`text-gray-500 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="px-4 py-4 space-y-5">

            {/* Wallet Balance Card */}
            <div className="bg-gradient-to-br from-[#FFF2EC] to-[#FFE5D8] rounded-[28px] p-6 shadow-sm border border-[#FFF2EC] flex items-center justify-between relative overflow-hidden">
              <div className="space-y-3.5 z-10">
                <span className="text-xs font-bold text-gray-500 tracking-wide uppercase">Available Balance</span>
                <div className="text-3xl font-extrabold text-[#1d2340]">
                  ₹{(balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>

                <button
                  onClick={() => navigate("/wallet")}
                  className="inline-flex items-center gap-2 bg-white border border-orange-200 px-4 py-1 rounded-full shadow-sm text-sm font-bold text-[#FF6F3D] hover:bg-orange-50 transition-colors"
                >
                  <WalletIcon size={18} className="text-[#FF6F3D]" />  
                                  Astro Wallet
                </button>
              </div>

             <div className="w-24 h-24 flex-shrink-0 z-10">
                             <img
                               src={walletIllustration}
                               alt="Wallet"
                               className="w-full h-full object-contain"
                             />
                           </div>

              {/* Decorative Blur BG */}
              <div className="absolute right-0 top-0 w-32 h-32 bg-orange-300/10 rounded-full blur-2xl pointer-events-none"></div>
            </div>

            {/* Quick Actions Row */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50 flex justify-between items-center gap-2">
              <button
                onClick={() => navigate("/deposit")}
                className="flex flex-col items-center gap-2 flex-1 group cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#FFF2EC] group-hover:bg-[#FFE5D8] transition-colors flex items-center justify-center text-[#FF6F3D]">
                  <Plus size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold text-gray-600 text-center leading-tight whitespace-pre-line">
                  Add Money
                </span>
              </button>

              <button className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                <div className="w-11 h-11 rounded-2xl bg-[#FFF2EC] group-hover:bg-[#FFE5D8] transition-colors flex items-center justify-center text-[#FF6F3D]">
                  <FileText size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold text-gray-600 text-center leading-tight whitespace-pre-line">
                  Transaction{"\n"}History
                </span>
              </button>

              <button className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                <div className="w-11 h-11 rounded-2xl bg-[#FFF2EC] group-hover:bg-[#FFE5D8] transition-colors flex items-center justify-center text-[#FF6F3D]">
                  <Tag size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold text-gray-600 text-center leading-tight whitespace-pre-line">
                  Offers &{"\n"}Coupons
                </span>
              </button>
            </div>

            {/* Recent Transactions */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h2 className="font-bold text-gray-800 text-[15px]">Recent Transactions</h2>
                <button className="text-[#FF6F3D] font-bold text-xs flex items-center gap-0.5 hover:underline cursor-pointer">
                  View All <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>

              {loading ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100/50 p-4 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-32 bg-gray-200 rounded" />
                        <div className="h-2 w-20 bg-gray-100 rounded" />
                      </div>
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : txList.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100/50 p-8 text-center">
                  <FileText size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">No transactions yet</p>
                  <p className="text-xs text-gray-300 mt-1">Add money or start a session to see history</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100/50 p-4 divide-y divide-gray-100">
                  {txList.map((tx, idx) => (
                    <div key={tx.id || idx} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tx.iconBg || "bg-gray-100 text-gray-500"}`}>
                          {renderIcon(tx.iconType)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm leading-tight">{tx.title}</h3>
                          <p className="text-[10px] text-gray-400 mt-1 font-medium">{tx.date}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-bold text-sm ${tx.amountClass || "text-gray-800"}`}>{tx.amount}</div>
                        <div className={`text-[10px] font-bold mt-1 ${tx.statusClass || "text-gray-400"}`}>{tx.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Bottom Navigation */}
        <Bottomnav />

      </div>
    </div>
  );
}
