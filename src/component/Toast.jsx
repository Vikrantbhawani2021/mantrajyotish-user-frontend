import React, { useEffect } from "react";

export default function Toast({ show, message, type = "info", onClose, duration = 3500 }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onClose && onClose(), duration);
    return () => clearTimeout(t);
  }, [show, duration, onClose]);

  if (!show) return null;

  const bg = type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-gray-800";

  return (
    <div className={`fixed left-1/2 -translate-x-1/2 bottom-28 z-50 ${bg} text-white px-4 py-2 rounded-xl shadow-lg max-w-xl w-[90%]`}> 
      <div className="text-sm font-medium">{message}</div>
    </div>
  );
}
