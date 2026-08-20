import { useState } from "react";

function CategoryTabs({ activeTab, setActiveTab }) {
  const tabs = ["All", "Love", "Marriage", "Career"];
  const [internalActive, setInternalActive] = useState("All");

  const active = activeTab !== undefined ? activeTab : internalActive;
  const setActive = setActiveTab !== undefined ? setActiveTab : setInternalActive;

  return (
    <div className="px-5">
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-4 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all duration-300 cursor-pointer active:scale-95
              ${
                active === tab
                  ? "bg-[#ff7448] text-white border-[#ff7448] shadow-md shadow-orange-500/20"
                  : "bg-white border-gray-200 text-gray-500 hover:text-gray-700"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CategoryTabs;