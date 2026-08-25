import React from "react";
import { ArrowRight } from "lucide-react";

const getGradientStyles = (bgColor) => {
  switch (bgColor) {
    case "bg-orange-200":
      return "from-[#FFFBF7] to-[#FFEBD9] border-orange-100 shadow-sm";
    case "bg-sky-200":
      return "from-[#F5FAFF] to-[#E1EFFF] border-sky-100 shadow-sm";
    case "bg-red-200":
      return "from-[#FFF7F7] to-[#FFE3E8] border-red-100 shadow-sm";
    case "bg-green-200":
      return "from-[#F5FDF7] to-[#E3F9E5] border-green-100 shadow-sm";
    case "bg-yellow-200":
      return "from-[#FFFDF5] to-[#FFF9D4] border-amber-100/70 shadow-sm";
    case "bg-pink-200":
      return "from-[#FFF5FA] to-[#FFE3F3] border-pink-100 shadow-sm";
    case "bg-gray-300":
      return "from-[#FAF9F9] to-[#EFEFEF] border-gray-200 shadow-sm";
    case "bg-purple-200":
      return "from-[#FAF8FF] to-[#EFE3FF] border-purple-100 shadow-sm";
    case "bg-cyan-200":
      return "from-[#F2FDFA] to-[#DDFBF5] border-teal-100 shadow-sm";
    default:
      return "from-white to-gray-50 border-gray-150 shadow-sm";
  }
};

function PlanetCard({ title, description, image, bgColor, onView }) {
  const gradientStyles = getGradientStyles(bgColor);

  return (
    <div
      onClick={onView}
      className={`bg-gradient-to-br ${gradientStyles} border rounded-[22px] p-4 relative overflow-hidden active:scale-[0.99] hover:scale-[1.01] hover:shadow-md transition-all duration-300 cursor-pointer flex gap-4 items-center`}
    >
      {/* Avatar Image */}
      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md shrink-0 relative z-10">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Details Area */}
      <div className="flex-1 min-w-0 flex flex-col text-left relative z-10">
        <h3 className="font-extrabold text-[#1d2340] text-[15px] leading-snug">
          {title}
        </h3>
        
        <p className="text-gray-500 font-medium text-[11px] leading-relaxed mt-1 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center gap-1 text-[10px] font-extrabold mt-2 text-[#FF6F3D] hover:text-[#e05e30] transition-colors select-none">
          <span>View Details</span>
          <ArrowRight size={10} className="stroke-[3]" />
        </div>
      </div>

      {/* Subtle background glow element */}
      <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/30 rounded-full blur-xl translate-x-8 translate-y-8 select-none pointer-events-none" />
    </div>
  );
}

export default PlanetCard;