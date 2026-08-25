import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import poojaImg from "../assets/pooja/ganesh-chaturthi.png";

const services = [
  {
    title: "Chat",
    sub: "With Astrology Experts",
    img: "https://res.cloudinary.com/dwbhbwgz9/image/upload/f_auto,q_auto/v1/astro_male_pic_1",
    path: "/chat",
    offer: true,
  },
  {
    title: "Call",
    sub: "1:1 Personal Guidance",
    img: "https://res.cloudinary.com/dwbhbwgz9/image/upload/f_auto,q_auto/v1/astro_male_pic_4",
    path: "/call",
    offer: true,
  },
  {
    title: "Astro History",
    sub: "Astrology Readings",
    img: "https://res.cloudinary.com/dwbhbwgz9/image/upload/f_auto,q_auto/v1/astro_male_pic_5",
    path: "/astro-history",
    offer: false,
  },
  {
    title: "Pooja",
    sub: "Personalised Pooja",
    img: poojaImg,
    path: "/pooja",
    offer: false,
  },
];

export default function ServiceGrid() {
  const navigate = useNavigate();
  const { isLoggedIn, triggerLoginModal } = useAuth();

  const handleNavigation = (item) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3.5 px-1">
      {services.map((item, index) => (
        <div
          key={index}
          onClick={() => handleNavigation(item)}
          className="relative min-h-[96px] rounded-2xl bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg p-3.5 cursor-pointer active:scale-95 transition-all duration-200 border border-orange-100/50 flex flex-col justify-between"
        >
          {/* Top Row: Title & Offer Badge */}

          <div className="flex items-start justify-between pr-1">
            <h2 className="text-base font-bold text-[#1d2340] tracking-tight">
              {item.title}
            </h2>
            {item.offer == true ?
              <span className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-sm shadow-orange-200">
                50% OFF
              </span>
              : <div></div>}
          </div>



          {/* Bottom Row: Subtitle & Profile Image */}
          <div className="flex items-end justify-between mt-2">
            <p className="max-w-[95px] text-[11px] font-medium leading-snug text-gray-500">
              {item.sub}
            </p>
            <img
              src={item.img}
              alt={item.title}
              className="h-11 w-11 rounded-full object-cover border-2 border-orange-100 shadow-sm shrink-0"
            />
          </div>
        </div>
      ))}
    </div>
  );
}