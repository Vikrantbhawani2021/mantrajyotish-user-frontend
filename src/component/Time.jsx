import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiMessageCircle,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import { MdLiveTv } from "react-icons/md";

function Time() {
  const navClass = ({ isActive }) =>
    `flex flex-col items-center transition-colors ${
      isActive ? "text-orange-500 font-semibold" : "text-gray-400"
    }`;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
      <div className="bg-white rounded-full shadow-2xl py-3 px-5 flex justify-between items-center">

        {/* Home */}
        <NavLink to="/home" className={navClass}>
          <FiHome className="text-xl sm:text-2xl" />
          <span className="text-[10px] sm:text-xs mt-1">Home</span>
        </NavLink>

        {/* Chat */}
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
            <NavLink to={chatPath} state={chatState} className={navClass}>
              <FiMessageCircle className="text-xl sm:text-2xl" />
              <span className="text-[10px] sm:text-xs mt-1">Chat</span>
            </NavLink>
          );
        })()}

        {/* Live Astro */}
        <NavLink to="/liveastro" className={navClass}>
          <MdLiveTv className="text-xl sm:text-2xl" />
          <span className="text-[10px] sm:text-xs mt-1 font-semibold">
            LIVE ASTRO
          </span>
        </NavLink>

        {/* Call */}
        <NavLink to="/call" className={navClass}>
          <FiPhone className="text-xl sm:text-2xl" />
          <span className="text-[10px] sm:text-xs mt-1">Call</span>
        </NavLink>

        {/* Profile */}
        <NavLink to="/profile" className={navClass}>
          <FiUser className="text-xl sm:text-2xl" />
          <span className="text-[10px] sm:text-xs mt-1">Profile</span>
        </NavLink>

      </div>
    </div>
  );
}

export default Time;