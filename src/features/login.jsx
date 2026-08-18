import { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import { BACKEND_URL } from "../config/backend";
import { sendOtp } from "../api/auth";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, logoutUser } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/home", { replace: true });
    }
  }, [isLoggedIn, navigate]);
  const [mobile, setMobile] = useState("");

  const handleSkip = () => {
    logoutUser();
    navigate("/home");
  };

  const handleMobileChange = (e) => {
    const val = e.target.value;
    // Only allow numbers and limit to 10 digits
    if (/^\d*$/.test(val) && val.length <= 10) {
      setMobile(val);
    }
  };

  const handleContinue = () => {
    if (mobile.length !== 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }
    navigate("/otp", { state: { from: location.state?.from } });
  };

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if (phone.length !== 10) {
      alert("Please enter a valid 10 digit mobile number");
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = "+91" + phone.trim();
      const data = await sendOtp(formattedPhone);

      if (data && data.success) {
        localStorage.setItem("phone", formattedPhone);
        navigate("/otp", { state: { from: location.state?.from } });
      } else {
        alert(data?.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("OTP Send Error:", error);
      alert(`Send Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#ff8253] flex flex-col justify-end overflow-hidden">
      {/* White Card */}
      <div className="bg-white rounded-t-[35px] h-[85vh] w-full px-6 py-8 overflow-y-auto relative">
        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-base font-medium transition-colors cursor-pointer"
        >
          Skip
        </button>

        {/* Logo */}
        <div className="flex justify-center mt-4">
          <img
            src={logo}
            alt="Logo"
            className="w-24 h-24 object-contain"
          />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-center mt-6">
          Welcome Back 👋
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Login to continue your astrology journey
        </p>

        {/* Mobile Input */}
        <div className="flex justify-center mt-8">
          <div className="w-full max-w-md flex items-center bg-gray-100 rounded-xl px-4 py-4">
            <Phone size={20} className="text-gray-600" />

            <input
              type="tel"
              placeholder="Enter Mobile Number"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              className="ml-3 w-full bg-transparent outline-none text-base"
            />
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <button
            onClick={sendOTP}
            disabled={loading}
            className={`w-full max-w-md mt-5 bg-[#ff7448] text-white py-4 rounded-xl text-lg font-semibold transition-opacity ${
              loading ? "opacity-60 cursor-not-allowed" : "hover:bg-[#ff6230]"
            }`}
          >
            {loading ? "Sending OTP..." : "Continue"}
          </button>
        </div>

        {/* Google Button */}
        <div className="flex justify-center">
          <button className="w-full max-w-md mt-5 border border-gray-300 py-4 rounded-xl text-[#5f82f5]">
            Continue with Google
          </button>
        </div>

        {/* reCAPTCHA Checkbox Container */}
        <div id="recaptcha-container" className="flex justify-center mt-4"></div>

      </div>
    </div>
  );
}

export default Login;