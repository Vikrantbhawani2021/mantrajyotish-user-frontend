import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

function CallHeader() {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-5 pt-10 pb-6 relative text-center">
      <button
        onClick={() => navigate("/home")}
        className="absolute left-5 top-10 text-white cursor-pointer hover:opacity-80 transition-opacity"
      >
        <ArrowLeft size={26} />
      </button>

      <div className="mb-1">
        <h1 className="text-2xl font-bold text-white">
          Audio &amp; Video Calls
        </h1>
        <p className="text-orange-100 text-sm mt-1">
          Consult with expert astrologers instantly
        </p>
      </div>
    </div>
  );
}

export default CallHeader;