import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, FileText, Tag, ChevronRight, Phone, MessageCircle, Video, RefreshCw, TrendingDown, TrendingUp, Sparkles, Wallet as WalletIcon, Copy, Check, HelpCircle, X, AlertCircle, Clock } from "lucide-react";
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
  const [latestLocalTx, setLatestLocalTx] = useState(null);
  const [dismissedTxId, setDismissedTxId] = useState(() => sessionStorage.getItem("dismissed_tx") || null);

  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getStatusBadge = (status) => {
    const normStatus = (status || "").toLowerCase();
    if (normStatus === "success" || normStatus === "completed" || normStatus === "successful") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
          Success
        </span>
      );
    }
    if (normStatus === "failed" || normStatus === "cancelled" || normStatus === "failure") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
        Pending
      </span>
    );
  };

  const isDeposit = (tx) => {
    if (!tx) return false;
    const titleLower = String(tx.title || "").toLowerCase();
    const amtStr = String(tx.amount || "");
    return (
      tx.iconType === "plus" || 
      titleLower.includes("added") || 
      titleLower.includes("recharge") || 
      titleLower.includes("reward") || 
      titleLower.includes("refund") || 
      amtStr.startsWith("+") ||
      tx.type === "credit"
    );
  };

  const formatAmountText = (tx) => {
    if (!tx || tx.amount === undefined || tx.amount === null) return "";
    const amtStr = String(tx.amount);
    const cleanAmt = amtStr.replace(/[+₹, ]/g, "");
    const parsed = parseFloat(cleanAmt);
    if (isNaN(parsed)) return amtStr;

    if (isDeposit(tx)) {
      return `+ ₹${parsed.toFixed(2)}`;
    }
    return `- ₹${Math.abs(parsed).toFixed(2)}`;
  };

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

      const queryStr = userId 
        ? `userId=${userId}&t=${Date.now()}` 
        : phone 
        ? `phone=${encodeURIComponent(phone)}&t=${Date.now()}` 
        : `t=${Date.now()}`;
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

        const queryStr = userId 
          ? `userId=${userId}&t=${Date.now()}` 
          : phone 
          ? `phone=${encodeURIComponent(phone)}&t=${Date.now()}` 
          : `t=${Date.now()}`;
        const data = await getTransactions(queryStr);
        if (data && data.success && Array.isArray(data.data)) {
          const existingIds = new Set();
          const existingPaymentIds = new Set();
          data.data.forEach(t => {
            if (t.id) existingIds.add(String(t.id));
            if (t.paymentId) existingPaymentIds.add(String(t.paymentId));
            if (t.meta?.transactionId) existingPaymentIds.add(String(t.meta.transactionId));
          });
          const filteredLocal = localTxs.filter(t => {
            const idStr = String(t.id || t.paymentId || "");
            return !existingIds.has(idStr) && !existingPaymentIds.has(idStr);
          });
          const merged = [...filteredLocal, ...data.data];
          merged.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
          setTxList(merged.slice(0, 10));
          return;
        }
      } catch (err) {
        console.error("Transactions fetch error:", err);
      }
    }

    setTxList(localTxs.slice(0, 10));
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
    // load latest local transaction for compact success summary
    try {
      const saved = localStorage.getItem("wallet_transactions");
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) {
          setLatestLocalTx(arr[0]);
        }
      }
    } catch {}
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
            {/* Compact success summary for the most recent local transaction */}
            {latestLocalTx && latestLocalTx.status === "Success" && String(latestLocalTx.id) !== String(dismissedTxId) && (
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-green-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-800">Last Transaction</div>
                  <div className="text-xs text-gray-500">+ ₹{(parseFloat((latestLocalTx.amount || "+ ₹0").replace(/[+₹, ]/g, "")) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { navigator.clipboard?.writeText(latestLocalTx.paymentId || latestLocalTx.id || ""); }} className="text-xs text-gray-500">Copy ID</button>
                  <button onClick={() => { sessionStorage.setItem("dismissed_tx", latestLocalTx.id); setDismissedTxId(latestLocalTx.id); }} className="text-xs font-bold text-[#FF6F3D]">Dismiss</button>
                </div>
              </div>
            )}
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

              <button
                onClick={() => navigate("/transaction-history")}
                className="flex flex-col items-center gap-2 flex-1 group cursor-pointer"
              >
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
                <button
                  onClick={() => navigate("/transaction-history")}
                  className="text-[#FF6F3D] font-bold text-xs flex items-center gap-0.5 hover:underline cursor-pointer"
                >
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
                    <div 
                      key={tx.id || idx} 
                      onClick={() => setSelectedTx(tx)}
                      className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-gray-50/50 -mx-2 px-2 rounded-2xl transition-all cursor-pointer group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tx.iconBg || "bg-gray-100 text-gray-500"}`}>
                          {renderIcon(tx.iconType)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm leading-tight group-hover:text-[#FF6F3D] transition-colors">
                            {tx.title || (String(tx.amount || "").startsWith("+") ? "Added Money" : "Consultation Session")}
                          </h3>
                          <p className="text-[10px] text-gray-400 mt-1 font-medium flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                            <span>{tx.date}</span>
                            {(tx.meta?.transactionId || tx.paymentId || tx.id) && (
                              <span className="text-gray-400 font-mono text-[9px] bg-gray-100 px-1 rounded border border-gray-100 max-w-[120px] truncate">
                                ID: {tx.meta?.transactionId || tx.paymentId || tx.id}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-bold text-sm ${
                          String(tx.amount || "").startsWith("+") || tx.iconType === "plus" || tx.type === "credit"
                            ? "text-green-600"
                            : "text-red-500"
                        }`}>
                          {tx.amount}
                        </div>
                        <div className={`text-[10px] font-bold mt-1 ${tx.statusClass || "text-gray-400"}`}>{tx.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Details Receipt Modal Overlay */}
        {selectedTx && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end justify-center z-[100] animate-fade-in">
            <div className="w-full bg-white rounded-t-[32px] p-6 space-y-6 shadow-2xl animate-slide-up max-w-[430px] border-t border-gray-100">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Transaction Details</span>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Circle Representation */}
              <div className="flex flex-col items-center justify-center text-center py-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3.5 shadow-sm ${
                  (selectedTx.status || "").toLowerCase() === "success" || (selectedTx.status || "").toLowerCase() === "completed"
                    ? "bg-green-50 text-green-500 border-2 border-green-200"
                    : (selectedTx.status || "").toLowerCase() === "failed" || (selectedTx.status || "").toLowerCase() === "cancelled"
                    ? "bg-red-50 text-red-500 border-2 border-red-200"
                    : "bg-amber-50 text-amber-500 border-2 border-amber-200"
                }`}>
                  {(selectedTx.status || "").toLowerCase() === "success" || (selectedTx.status || "").toLowerCase() === "completed" ? (
                    <Check size={32} strokeWidth={3} />
                  ) : (selectedTx.status || "").toLowerCase() === "failed" || (selectedTx.status || "").toLowerCase() === "cancelled" ? (
                    <AlertCircle size={32} strokeWidth={2.5} />
                  ) : (
                    <Clock size={32} strokeWidth={2.5} />
                  )}
                </div>
                <h2 className="text-2xl font-black text-gray-800">
                  {formatAmountText(selectedTx)}
                </h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
                  {selectedTx.title || (isDeposit(selectedTx) ? "Added Money" : "Consultation Session")}
                </p>
              </div>

              {/* Receipt Body */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-3.5 relative overflow-hidden">
                {/* Decorative cutouts for receipt looks */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#FAFAFA] border-r border-gray-100 rounded-full"></div>
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#FAFAFA] border-l border-gray-100 rounded-full"></div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold">Transaction Type</span>
                  <span className="font-extrabold text-gray-700">
                    {isDeposit(selectedTx) ? "Deposit (Credit)" : "Consultation (Debit)"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold">Date & Time</span>
                  <span className="font-extrabold text-gray-700">{selectedTx.date}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold">Status</span>
                  <span>{getStatusBadge(selectedTx.status)}</span>
                </div>

                <div className="border-t border-dashed border-gray-200/80 my-3"></div>

                <div className="flex justify-between items-start text-xs">
                  <span className="text-gray-400 font-bold mt-1">Transaction ID</span>
                  <div className="flex items-center gap-1.5 bg-white border border-gray-100 px-2.5 py-1 rounded-lg shadow-2xs">
                    <span className="font-mono text-gray-600 select-all max-w-[150px] truncate text-[10px]">
                      {selectedTx.id || selectedTx.paymentId || "N/A"}
                    </span>
                    <button
                      onClick={() => handleCopyId(selectedTx.id || selectedTx.paymentId)}
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors cursor-pointer"
                    >
                      {copiedId ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {selectedTx.paymentId && selectedTx.id && selectedTx.paymentId !== selectedTx.id && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold">Gateway Ref ID</span>
                    <span className="font-mono text-gray-600 text-[10px]">{selectedTx.paymentId}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => { setSelectedTx(null); navigate("/help-support"); }}
                  className="w-full py-3.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
                >
                  <HelpCircle size={16} /> Need help with this payment?
                </button>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="w-full py-3.5 rounded-2xl bg-[#FF6F3D] hover:bg-[#e05626] text-white font-extrabold text-xs transition-all cursor-pointer active:scale-98 shadow-sm"
                >
                  Close Receipt
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <Bottomnav />

      </div>
    </div>
  );
}
