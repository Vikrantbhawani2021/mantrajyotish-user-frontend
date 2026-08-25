import React, { useState } from "react";

import ganeshPooja from "../assets/pooja/ganesh-chaturthi.png";
import navgrahapooja from "../assets/pooja/navgraha-shanti.png";
import mahaMrityanjaya from "../assets/pooja/maha-mrityanjaya.png";

import { useNavigate } from "react-router-dom";

import {
    FiArrowLeft,
    FiSearch,
    FiSliders,
    FiClock,
    FiUser,
    FiCheckCircle,
    FiMessageCircle,
    FiCalendar,
    FiGift,
} from "react-icons/fi";

import Bottomnav from "../component/Bottomnav";


// ============================================================
// POOJA DATA
// ============================================================

const poojaServices = [
    {
        id: 1,
        title: "Ganesh Chaturthi Pooja",
        shortDescription:
            "Removes obstacles and brings success, prosperity and positive energy.",
        description:
            "Ganesh Chaturthi Pooja is performed to seek Lord Ganesha's blessings for removing obstacles, improving success and bringing prosperity into life.",
        image: ganeshPooja,
        duration: "60–90 mins",
        purohit: "1 Purohit",
        price: 1499,
        oldPrice: 1999,
        category: "Ganesh",
        popular: true,
        benefits: [
            "Removes obstacles",
            "Brings success & prosperity",
            "Positive energy",
            "Peace of mind",
        ],
    },

    {
        id: 2,
        title: "Mahalakshmi Pooja",
        shortDescription:
            "Attract wealth, prosperity and good fortune with Maa Lakshmi's blessings.",
        description:
            "Mahalakshmi Pooja is performed to invite prosperity, abundance and financial stability into your life.",
        image:
            "https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&w=800&q=80",
        duration: "45–60 mins",
        purohit: "1 Purohit",
        price: 1999,
        oldPrice: 2499,
        category: "Lakshmi",
        popular: true,
        benefits: [
            "Financial prosperity",
            "Wealth & abundance",
            "Business growth",
            "Peace & happiness",
        ],
    },

    {
        id: 3,
        title: "Maha Mrityunjaya Pooja",
        shortDescription:
            "Performed for protection, health, strength and peace of mind.",
        description:
            "Maha Mrityunjaya Pooja is a powerful Vedic ritual performed for protection, inner strength, peace and spiritual well-being.",
        image: mahaMrityanjaya,
        duration: "60–90 mins",
        purohit: "1 Purohit",
        price: 2499,
        oldPrice: 2999,
        category: "Shiva",
        popular: false,
        benefits: [
            "Protection from negativity",
            "Peace of mind",
            "Spiritual strength",
            "Positive energy",
        ],
    },

    {
        id: 4,
        title: "Navgraha Shanti Pooja",
        shortDescription:
            "Balances planetary energies and helps reduce negative effects of Grahas.",
        description:
            "Navgraha Shanti Pooja is performed to seek blessings from the nine planets and reduce unfavorable planetary influences.",
        image: navgrahapooja,
        duration: "90–120 mins",
        purohit: "2 Purohits",
        price: 2999,
        oldPrice: 3499,
        category: "Navgraha",
        popular: false,
        benefits: [
            "Planetary balance",
            "Reduces Doshas",
            "Improves positivity",
            "Removes negative influences",
        ],
    },
];

const categories = [
    "All",
    "Ganesh",
    "Lakshmi",
    "Shiva",
    "Navgraha",
];


// ============================================================
// MAIN COMPONENT
// ============================================================

function Pooja() {
    const navigate = useNavigate();

    const [selectedPooja, setSelectedPooja] = useState(null);
    const [category, setCategory] = useState("All");
    const [search, setSearch] = useState("");


    // ----------------------------------------------------------
    // FILTER POOJAS
    // ----------------------------------------------------------

    const filteredPoojas = poojaServices.filter((pooja) => {
        const matchesCategory =
            category === "All" ||
            pooja.category === category;

        const matchesSearch =
            pooja.title
                .toLowerCase()
                .includes(search.toLowerCase());

        return matchesCategory && matchesSearch;
    });


    // ----------------------------------------------------------
    // WHATSAPP BOOKING REQUEST
    // ----------------------------------------------------------

    const handleBookOnWhatsApp = (
        pooja,
        selectedDate,
        selectedTime
    ) => {
        if (!selectedDate || !selectedTime) {
            return;
        }

        // Replace this with your actual WhatsApp number.
        // Country code + number without + or spaces.
        const phoneNumber = "919876543210";


        const formattedDate = new Date(
            `${selectedDate}T00:00:00`
        ).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });


        const message = `Namaste 🙏

I would like to book a Pooja.

🪔 Pooja: ${pooja.title}
📅 Preferred Date: ${formattedDate}
⏰ Preferred Time: ${selectedTime}
💰 Price: ₹${pooja.price}
⏱ Duration: ${pooja.duration}
👤 Purohit: ${pooja.purohit}

Could you please confirm whether a Purohit is available at this date and time?

If available, please confirm my booking.

Thank you 🙏`;


        const whatsappUrl =
            `https://wa.me/${phoneNumber}?text=` +
            encodeURIComponent(message);


        window.open(
            whatsappUrl,
            "_blank",
            "noopener,noreferrer"
        );
    };


    // ==========================================================
    // DETAIL VIEW
    // ==========================================================

    if (selectedPooja) {
        return (
            <PoojaDetails
                pooja={selectedPooja}
                onBack={() => setSelectedPooja(null)}
                onBook={(date, time) =>
                    handleBookOnWhatsApp(
                        selectedPooja,
                        date,
                        time
                    )
                }
            />
        );
    }


    // ==========================================================
    // LIST VIEW
    // ==========================================================

    return (
        <div className="min-h-screen bg-[#F6E9E3] flex justify-center">

            <div className="w-full max-w-[430px] bg-[#FDE8E4] min-h-screen relative shadow-xl">

                <div className="pb-28 overflow-y-auto">


                    {/* ==================================================
                        HEADER
                    ================================================== */}

                    <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-b-[32px] px-5 pt-10 pb-7">

                        <div className="flex items-center gap-4">

                            <button
                                onClick={() => navigate(-1)}
                                className="text-white"
                                aria-label="Go back"
                            >
                                <FiArrowLeft size={27} />
                            </button>


                            <div>

                                <h1 className="text-2xl font-bold text-white">
                                    Pooja Services
                                </h1>

                                <p className="text-orange-100 text-sm mt-1">
                                    Divine blessings for a better life
                                </p>

                            </div>

                        </div>


                        {/* SEARCH */}

                        <div className="mt-6 bg-white rounded-full h-14 px-5 flex items-center gap-3 shadow-md">

                            <FiSearch
                                size={22}
                                className="text-gray-400 shrink-0"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                                placeholder="Search for pooja..."
                                className="flex-1 outline-none text-gray-700 placeholder:text-gray-400 bg-transparent"
                            />

                            <FiSliders
                                size={21}
                                className="text-gray-400"
                            />

                        </div>

                    </div>


                    {/* ==================================================
                        CATEGORIES
                    ================================================== */}

                    <div className="px-4 mt-5 overflow-x-auto scrollbar-none">

                        <div className="flex gap-2.5 w-max">

                            {categories.map((item) => (

                                <button
                                    key={item}
                                    onClick={() =>
                                        setCategory(item)
                                    }
                                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${category === item
                                        ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                                        : "bg-white text-[#5f6578] border border-gray-200"
                                        }`}
                                >
                                    {item}
                                </button>

                            ))}

                        </div>

                    </div>


                    {/* ==================================================
                        BENEFITS
                    ================================================== */}

                    <div className="mx-4 mt-5 bg-gradient-to-r from-orange-50 to-[#fff7f3] rounded-3xl border border-orange-100 p-2">

                        <div className="grid grid-cols-4 divide-x divide-orange-200">

                            <Benefit
                                icon={<FiCheckCircle />}
                                title="Authentic"
                                sub="Vedic Vidhi"
                            />

                            <Benefit
                                icon={<FiUser />}
                                title="Experienced"
                                sub="Purohits"
                            />

                            <Benefit
                                icon={<FiClock />}
                                title="Timely"
                                sub="Pooja"
                            />

                            <Benefit
                                icon={<FiGift />}
                                title="Prasad"
                                sub="Available"
                            />

                        </div>

                    </div>


                    {/* ==================================================
                        POOJA LIST
                    ================================================== */}

                    <div className="px-4 mt-6 space-y-4">

                        {filteredPoojas.length === 0 ? (

                            <div className="bg-white rounded-3xl p-8 text-center">

                                <p className="text-gray-500">
                                    No pooja found.
                                </p>

                            </div>

                        ) : (

                            filteredPoojas.map((pooja) => (

                                <PoojaCard
                                    key={pooja.id}
                                    pooja={pooja}
                                    onClick={() =>
                                        setSelectedPooja(pooja)
                                    }
                                />

                            ))

                        )}

                    </div>

                </div>


                {/* BOTTOM NAV */}

                <Bottomnav />

            </div>

        </div>
    );
}


// ============================================================
// BENEFIT
// ============================================================

function Benefit({
    icon,
    title,
    sub,
}) {
    return (
        <div className="flex flex-col items-center justify-center text-center px-1 min-h-[68px]">

            <div className="h-7 flex items-center justify-center text-orange-500">

                {React.cloneElement(icon, {
                    size: 20,
                })}

            </div>


            <p className="h-4 flex items-center justify-center text-[10px] font-bold text-[#1d2340] leading-none">
                {title}
            </p>


            <p className="h-4 flex items-center justify-center text-[9px] text-gray-500 leading-none">
                {sub}
            </p>

        </div>
    );
}


// ============================================================
// POOJA CARD
// ============================================================

function PoojaCard({
    pooja,
    onClick,
}) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-white rounded-[25px] overflow-hidden border border-orange-100 shadow-sm hover:shadow-md active:scale-[0.99] transition-all"
        >

            <div className="flex">


                {/* IMAGE */}

                <div className="relative w-[38%] shrink-0">

                    <img
                        src={pooja.image}
                        alt={pooja.title}
                        className="w-full h-full min-h-[180px] object-cover"
                    />


                    {pooja.popular && (

                        <span className="absolute top-3 left-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-r-full">
                            POPULAR
                        </span>

                    )}

                </div>


                {/* CONTENT */}

                <div className="flex-1 p-4">

                    <h2 className="text-[17px] font-bold text-[#1d2340] leading-tight">
                        {pooja.title}
                    </h2>


                    <p className="text-gray-500 text-xs leading-5 mt-2 line-clamp-2">
                        {pooja.shortDescription}
                    </p>


                    <div className="flex items-center gap-3 mt-3 text-gray-500 text-[11px]">

                        <span className="flex items-center gap-1">

                            <FiClock className="text-orange-500" />

                            {pooja.duration}

                        </span>


                        <span className="flex items-center gap-1">

                            <FiUser className="text-orange-500" />

                            {pooja.purohit}

                        </span>

                    </div>


                    <div className="border-t border-gray-100 mt-3 pt-3 flex items-end justify-between">

                        <div>

                            <p className="text-orange-500 text-xl font-bold">
                                ₹{pooja.price.toLocaleString("en-IN")}
                            </p>


                            <p className="text-gray-400 text-xs line-through">
                                ₹{pooja.oldPrice.toLocaleString("en-IN")}
                            </p>

                        </div>


                        <span className="text-orange-500 text-xs font-semibold">
                            View Details →
                        </span>

                    </div>

                </div>

            </div>

        </button>
    );
}


// ============================================================
// POOJA DETAILS
// ============================================================

function PoojaDetails({
    pooja,
    onBack,
    onBook,
}) {

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");


    // ----------------------------------------------------------
    // AVAILABLE TIME SLOTS
    // ----------------------------------------------------------

    const timeSlots = [
        "09:00 AM",
        "11:00 AM",
        "01:00 PM",
        "03:00 PM",
        "05:00 PM",
        "07:00 PM",
    ];


    // ----------------------------------------------------------
    // TODAY
    // ----------------------------------------------------------

    const today = new Date()
        .toISOString()
        .split("T")[0];


    const canRequestBooking =
        Boolean(selectedDate && selectedTime);


    return (
        <div className="min-h-screen bg-[#F6E9E3] flex justify-center">

            <div className="w-full max-w-[430px] bg-[#FDE8E4] min-h-screen relative shadow-xl">

                <div className="pb-32 overflow-y-auto">


                    {/* ==================================================
                        IMAGE HEADER
                    ================================================== */}

                    <div className="relative">

                        <img
                            src={pooja.image}
                            alt={pooja.title}
                            className="w-full h-[310px] object-cover"
                        />


                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />


                        {/* BACK */}

                        <button
                            onClick={onBack}
                            className="absolute top-10 left-5 w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow-md"
                            aria-label="Go back"
                        >

                            <FiArrowLeft
                                size={23}
                                className="text-[#1d2340]"
                            />

                        </button>


                        {/* POPULAR */}

                        {pooja.popular && (

                            <span className="absolute top-10 right-5 bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full">
                                POPULAR
                            </span>

                        )}


                        {/* TITLE */}

                        <div className="absolute bottom-10 left-5 right-5">

                            <h1 className="text-2xl font-bold text-white">
                                {pooja.title}
                            </h1>

                        </div>

                    </div>


                    {/* ==================================================
                        MAIN DETAILS CARD
                    ================================================== */}

                    <div className="px-4 -mt-8 relative">

                        <div className="bg-white rounded-[28px] p-5 shadow-sm">


                            {/* ==================================================
                                PRICE
                            ================================================== */}

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-gray-400 text-xs">
                                        Pooja starting from
                                    </p>


                                    <div className="flex items-center gap-2 mt-1">

                                        <span className="text-2xl font-bold text-orange-500">
                                            ₹{pooja.price.toLocaleString("en-IN")}
                                        </span>


                                        <span className="text-sm text-gray-400 line-through">
                                            ₹{pooja.oldPrice.toLocaleString("en-IN")}
                                        </span>

                                    </div>

                                </div>


                                <div className="bg-orange-50 rounded-2xl px-3 py-2 text-center">

                                    <p className="text-orange-500 text-xs font-semibold">
                                        SAVE
                                    </p>


                                    <p className="text-orange-500 font-bold">
                                        ₹{(
                                            pooja.oldPrice -
                                            pooja.price
                                        ).toLocaleString("en-IN")}
                                    </p>

                                </div>

                            </div>


                            {/* ==================================================
                                INFO
                            ================================================== */}

                            <div className="grid grid-cols-2 gap-3 mt-5">

                                <InfoBox
                                    icon={<FiClock />}
                                    title="Duration"
                                    value={pooja.duration}
                                />


                                <InfoBox
                                    icon={<FiUser />}
                                    title="Performed By"
                                    value={pooja.purohit}
                                />

                            </div>


                            {/* ==================================================
                                DESCRIPTION
                            ================================================== */}

                            <div className="mt-6">

                                <h2 className="font-bold text-[#1d2340] text-lg">
                                    About this Pooja
                                </h2>


                                <p className="text-gray-500 text-sm leading-6 mt-2">
                                    {pooja.description}
                                </p>

                            </div>


                            {/* ==================================================
                                BENEFITS
                            ================================================== */}

                            <div className="mx-4 mt-5 bg-gradient-to-r from-orange-50 to-[#fff7f3] rounded-3xl border border-orange-100 p-3">

                                <div className="grid grid-cols-4 divide-x divide-orange-200">

                                    <Benefit
                                        icon={<FiCheckCircle />}
                                        title="Authentic"
                                        sub="Vedic Vidhi"
                                    />


                                    <Benefit
                                        icon={<FiUser />}
                                        title="Experienced"
                                        sub="Purohits"
                                    />


                                    <Benefit
                                        icon={<FiClock />}
                                        title="Timely"
                                        sub="Pooja"
                                    />


                                    <Benefit
                                        icon={<FiGift />}
                                        title="Prasad"
                                        sub="Available"
                                    />

                                </div>

                            </div>


                            {/* ==================================================
                                SELECT DATE
                            ================================================== */}

                            <div className="mt-7">

                                <h2 className="font-bold text-[#1d2340] text-lg">
                                    Select Date
                                </h2>


                                <p className="text-gray-500 text-xs mt-1">
                                    Choose your preferred Pooja date
                                </p>


                                <div className="relative mt-3">

                                    <FiCalendar
                                        size={20}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 pointer-events-none"
                                    />


                                    <input
                                        type="date"
                                        min={today}
                                        value={selectedDate}
                                        onChange={(e) =>
                                            setSelectedDate(
                                                e.target.value
                                            )
                                        }
                                        className="w-full h-14 rounded-2xl border border-orange-100 bg-[#FFF9F6] pl-12 pr-4 text-[#1d2340] font-semibold outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                    />

                                </div>

                            </div>


                            {/* ==================================================
                                SELECT TIME
                            ================================================== */}

                            <div className="mt-6">

                                <h2 className="font-bold text-[#1d2340] text-lg">
                                    Select Time
                                </h2>


                                <p className="text-gray-500 text-xs mt-1">
                                    Select your preferred Pooja time
                                </p>


                                <div className="grid grid-cols-2 gap-3 mt-4">

                                    {timeSlots.map((time) => {

                                        const selected =
                                            selectedTime === time;


                                        return (

                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedTime(
                                                        time
                                                    )
                                                }
                                                className={`h-12 rounded-2xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all ${selected
                                                    ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200"
                                                    : "bg-[#FFF9F6] border-orange-100 text-[#5f6578] hover:border-orange-300"
                                                    }`}
                                            >

                                                <FiClock size={16} />

                                                {time}

                                            </button>

                                        );

                                    })}

                                </div>

                            </div>


                            {/* ==================================================
                                BOOKING REQUEST SUMMARY
                            ================================================== */}

                            {canRequestBooking && (

                                <div className="mt-6 bg-orange-50 border border-orange-100 rounded-2xl p-4">

                                    <p className="text-orange-600 text-xs font-bold">
                                        BOOKING REQUEST
                                    </p>


                                    <div className="mt-2">

                                        <p className="text-[#1d2340] font-bold text-sm">

                                            {new Date(
                                                `${selectedDate}T00:00:00`
                                            ).toLocaleDateString(
                                                "en-IN",
                                                {
                                                    weekday: "long",
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                }
                                            )}

                                        </p>


                                        <p className="text-gray-500 text-sm mt-1">
                                            {selectedTime}
                                        </p>

                                    </div>


                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-orange-100">

                                        <span className="text-gray-500 text-xs">
                                            Pooja Price
                                        </span>


                                        <span className="text-orange-500 font-bold">
                                            ₹{pooja.price.toLocaleString("en-IN")}
                                        </span>

                                    </div>


                                    <p className="text-gray-500 text-xs mt-3 leading-5">
                                        Your request will be sent to our
                                        team on WhatsApp. They will confirm
                                        whether a Purohit is available at
                                        your selected time.
                                    </p>

                                </div>

                            )}


                            {/* ==================================================
                                BOOKING NOTE
                            ================================================== */}

                            <div className="mt-6 bg-gray-50 rounded-2xl p-4">

                                <p className="text-gray-500 text-xs leading-5">
                                    🙏 This is an availability request.
                                    Your Pooja will be confirmed only after
                                    our team confirms the selected date
                                    and time.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    FIXED WHATSAPP BUTTON
                ================================================== */}

                <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-orange-100 p-4">

                    <button
                        onClick={() =>
                            onBook(
                                selectedDate,
                                selectedTime
                            )
                        }
                        disabled={!canRequestBooking}
                        className={`w-full h-14 rounded-full text-white font-bold text-base flex items-center justify-center gap-3 shadow-lg transition-all ${canRequestBooking
                            ? "bg-[#25D366] active:scale-[0.98]"
                            : "bg-gray-300 cursor-not-allowed"
                            }`}
                    >

                        <FiMessageCircle size={23} />


                        {canRequestBooking
                            ? "Check Availability on WhatsApp"
                            : "Select Date & Time"}

                    </button>

                </div>

            </div>

        </div>
    );
}


// ============================================================
// INFO BOX
// ============================================================

function InfoBox({
    icon,
    title,
    value,
}) {
    return (
        <div className="bg-[#FDF6F2] rounded-2xl p-3">

            <div className="flex items-center gap-2 text-orange-500">

                {icon}

                <span className="text-xs font-semibold">
                    {title}
                </span>

            </div>


            <p className="text-[#1d2340] text-sm font-semibold mt-2">
                {value}
            </p>

        </div>
    );
}


export default Pooja;