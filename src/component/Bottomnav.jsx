import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaComments,
  FaPhoneAlt,
  FaUser,
} from "react-icons/fa";
import { MdLiveTv } from "react-icons/md";
import { useAuth } from "../context/AuthContext";

function Bottomnav() {
  const { isLoggedIn, triggerLoginModal } = useAuth();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-3 pb-2 z-50">
      <div className="bg-white h-[82px] rounded-full shadow-2xl flex justify-around items-center">

        <NavLink
          to="/home"
          className={({ isActive }) =>
            `flex flex-col items-center flex-1 ${
              isActive ? "text-orange-500" : "text-[#8E90A6]"
            }`
          }
        >
          <FaHome size={22} />
          <span className="text-[11px] mt-1">Home</span>
        </NavLink>

        {(() => {
          const activeChatStr = localStorage.getItem("active_chat_session");
          let chatPath = "/chat";
          let chatState = null;
          if (activeChatStr) {
            try {
              const active = JSON.parse(activeChatStr);
              if (active && active.name && active.sessionId) {
                chatPath = `/chat-session/${active.name}`;
                chatState = { astrologer: { name: active.name }, sessionId: active.sessionId };
              }
            } catch {}
          }
          return (
            <NavLink
              to={chatPath}
              state={chatState}
              className={({ isActive }) =>
                `flex flex-col items-center flex-1 ${
                  isActive ? "text-orange-500" : "text-[#8E90A6]"
                }`
              }
            >
              <FaComments size={22} />
              <span className="text-[11px] mt-1">Chat</span>
            </NavLink>
          );
        })()}

        <NavLink
          to="/liveastro"
          className={({ isActive }) =>
            `flex flex-col items-center flex-1 ${
              isActive ? "text-orange-500" : "text-[#8E90A6]"
            }`
          }
        >
          <MdLiveTv size={22} />
          <span className="text-[10px] mt-1">LIVE ASTRO</span>
        </NavLink>

        <NavLink
          to="/call"
          className={({ isActive }) =>
            `flex flex-col items-center flex-1 ${
              isActive ? "text-orange-500" : "text-[#8E90A6]"
            }`
          }
        >
          <FaPhoneAlt size={22} />
          <span className="text-[11px] mt-1">Call</span>
        </NavLink>

        {isLoggedIn ? (
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center flex-1 ${
                isActive ? "text-orange-500" : "text-[#8E90A6]"
              }`
            }
          >
            <FaUser size={22} />
            <span className="text-[11px] mt-1">Profile</span>
          </NavLink>
        ) : (
          <button
            onClick={() => triggerLoginModal("Profile", "/profile")}
            className="flex flex-col items-center flex-1 text-[#8E90A6] cursor-pointer"
          >
            <FaUser size={22} />
            <span className="text-[11px] mt-1">Profile</span>
          </button>
        )}

      </div>
    </div>
  );
}

export default Bottomnav;