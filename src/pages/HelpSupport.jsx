import { useState } from "react";
import {
  FiArrowLeft,
  FiPhone,
  FiMail,
  FiMessageSquare,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const CONTACT_OPTIONS = [
  {
    icon: FiPhone,
    title: "Call Support",
    sub: "+91 9876543210",
    color: "bg-green-100 text-green-600",
    link: "tel:+919876543210",
  },
  {
    icon: FiMail,
    title: "Email Support",
    sub: "support@astroapp.com",
    color: "bg-blue-100 text-blue-600",
    link: "mailto:support@astroapp.com",
  },
  {
    icon: FiMessageSquare,
    title: "Live Chat",
    sub: "Start chatting with our support team",
    color: "bg-orange-100 text-orange-500",
    link: "/support/chat",
    linkType: "internal",
  },
];

const FAQS = [
  {
    title: "How wallet deduction works?",
    answer:
      "Wallet balance is deducted according to the consultation duration and the astrologer's per minute charges.",
  },
  {
    title: "How can I recharge my wallet?",
    answer:
      "Go to Wallet → Recharge Wallet, choose an amount and complete the payment using UPI, Card or Net Banking.",
  },
  {
    title: "Can I get refund?",
    answer:
      "Yes. If the consultation is disconnected because of technical issues, the unused amount will be refunded automatically.",
  },
  {
    title: "How do I contact support?",
    answer:
      "You can contact us via Call, Email or Live Chat. Our support team is available 24×7.",
  },
];

function HelpSupport() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq((current) => (current === index ? null : index));
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex justify-center">
      <div className="w-full max-w-md">
        <Header onBack={() => navigate(-1)} />

        <HelpBanner />

        <main className="px-4 mt-6">
          <SectionTitle>Contact Us</SectionTitle>

          <div>
            {CONTACT_OPTIONS.map((contact) => (
              <ContactCard
                key={contact.title}
                {...contact}
              />
            ))}
          </div>

          <SectionTitle className="mt-8">
            Frequently Asked Questions
          </SectionTitle>

          <div>
            {FAQS.map((faq, index) => (
              <Faq
                key={faq.title}
                {...faq}
                open={openFaq === index}
                onClick={() => toggleFaq(index)}
              />
            ))}
          </div>
        </main>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-4px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-in {
            animation: fadeIn 0.2s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
}

function Header({ onBack }) {
  return (
    <header className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-b-[35px] shadow-lg px-5 pt-12 pb-8 mb-10 relative">
      <button
        onClick={onBack}
        className="absolute left-5 top-12 text-white"
        aria-label="Go back"
      >
        <FiArrowLeft size={24} />
      </button>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">
          Help & Support
        </h1>

        <p className="text-orange-100 mt-2">
          We're always here to help you
        </p>
      </div>
    </header>
  );
}

function HelpBanner() {
  return (
    <div className="mx-4 -mt-6 bg-white rounded-3xl shadow-lg p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
        <FiMessageSquare
          size={20}
          className="text-orange-500"
        />
      </div>

      <div>
        <h2 className="text-base font-bold">
          Need Immediate Help?
        </h2>

        <p className="text-gray-500 mt-1 text-sm">
          Our support team is available 24×7.
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children, className = "" }) {
  return (
    <h2
      className={`text-base font-bold mb-4 ${className}`}
    >
      {children}
    </h2>
  );
}

function ContactCard({
  icon: Icon,
  title,
  sub,
  color,
  link,
  linkType,
}) {
  const isInternal = linkType === "internal";

  const cardClassName =
    "bg-white rounded-3xl border border-orange-100 p-5 flex items-center justify-between shadow-sm mb-4 hover:shadow-md transition-all duration-300 cursor-pointer";

  const content = (
    <>
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${color}`}
        >
          <Icon />
        </div>

        <div>
          <h3 className="font-bold text-[#1d2340] text-base">
            {title}
          </h3>

          <p className="text-gray-500 text-sm mt-0.5">
            {sub}
          </p>
        </div>
      </div>

      <FiChevronRight className="text-xl text-gray-400" />
    </>
  );

  if (isInternal) {
    return (
      <a href={link} className={cardClassName}>
        {content}
      </a>
    );
  }

  return (
    <a href={link} className={cardClassName}>
      {content}
    </a>
  );
}

function Faq({
  title,
  answer,
  open,
  onClick,
}) {
  return (
    <div className="bg-white rounded-3xl border border-orange-100 shadow-sm mb-4 overflow-hidden transition-all duration-300">
      <button
        onClick={onClick}
        className="w-full p-5 flex justify-between items-center text-left font-semibold text-gray-800 text-[16px] cursor-pointer hover:bg-orange-50/20 transition-colors"
        aria-expanded={open}
      >
        <span>{title}</span>

        {open ? (
          <FiChevronUp className="text-orange-500 text-xl shrink-0" />
        ) : (
          <FiChevronDown className="text-gray-400 text-xl shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 text-gray-500 text-sm leading-relaxed border-t border-orange-50/40 pt-3 animate-fade-in">
          {answer}
        </div>
      )}
    </div>
  );
}

export default HelpSupport;