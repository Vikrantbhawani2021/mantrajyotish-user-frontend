const fs = require("fs");
const path = require("path");

const patchRoutes = () => {
  const authRoutePath = path.resolve(__dirname, "../ASTROOO/src/routes/auth.route.js");
  let content = fs.readFileSync(authRoutePath, "utf8");
  if (!content.includes("authController.refresh")) {
    content = content.replace(
      'router.post("/verify-otp", authController.verifyOtp);',
      'router.post("/verify-otp", authController.verifyOtp);\nrouter.post("/refresh", authController.refresh);'
    );
    fs.writeFileSync(authRoutePath, content, "utf8");
    console.log("Patched auth.route.js successfully");
  } else {
    console.log("auth.route.js is already patched");
  }
};

const patchControllers = () => {
  const authControllerPath = path.resolve(__dirname, "../ASTROOO/src/controllers/auth.controller.js");
  let content = fs.readFileSync(authControllerPath, "utf8");
  if (!content.includes("const refresh =")) {
    const replacement = `const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required"
            });
        }

        const data = await authService.refresh(refreshToken);

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message || "Invalid refresh token"
        });
    }
};

module.exports = {
    sendOtp,
    verifyOtp,
    refresh
};`;
    content = content.replace(
      /module\.exports\s*=\s*\{[\s\S]*?sendOtp,[\s\S]*?verifyOtp[\s\S]*?\};/,
      replacement
    );
    fs.writeFileSync(authControllerPath, content, "utf8");
    console.log("Patched auth.controller.js successfully");
  } else {
    console.log("auth.controller.js is already patched");
  }
};

const patchServices = () => {
  const authServicePath = path.resolve(__dirname, "../ASTROOO/src/services/auth.service.js");
  let content = fs.readFileSync(authServicePath, "utf8");
  
  if (!content.includes("const refresh =")) {
    // 1. Update imports
    content = content.replace(
      'const { generateToken } = require("../utils/jwt");',
      'const { generateToken, generateRefreshToken, verifyRefreshToken } = require("../utils/jwt");'
    );

    // 2. Update verifyOtp to return token & refreshToken
    const targetVerifyOtp = `    // Generate JWT token
    const token = generateToken({
        userId: user._id,
        role: user.role
    });

    return {
        user,
        token
    };`;
  
    const replacementVerifyOtp = `    // Generate JWT token
    const token = generateToken({
        userId: user._id,
        role: user.role
    });
    const refreshToken = generateRefreshToken({
        userId: user._id,
        role: user.role
    });

    return {
        user,
        token,
        refreshToken
    };`;

    content = content.replace(targetVerifyOtp, replacementVerifyOtp);

    // 3. Add refresh service and update module.exports
    const refreshService = `/**
 * Refresh access token using refresh token
 * @param {string} tokenStr - Refresh token
 */
const refresh = async (tokenStr) => {
    try {
        const decoded = verifyRefreshToken(tokenStr);
        if (!decoded || !decoded.userId) {
            throw new Error("Invalid token payload");
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            throw new Error("User not found");
        }

        const token = generateToken({
            userId: user._id,
            role: user.role
        });
        const refreshToken = generateRefreshToken({
            userId: user._id,
            role: user.role
        });

        return {
            token,
            refreshToken
        };
    } catch (error) {
        throw new Error(error.message || "Failed to refresh token");
    }
};

module.exports = {
    sendOtp,
    verifyOtp,
    refresh
};`;

    content = content.replace(
      /module\.exports\s*=\s*\{[\s\S]*?sendOtp,[\s\S]*?verifyOtp[\s\S]*?\};/,
      refreshService
    );

    fs.writeFileSync(authServicePath, content, "utf8");
    console.log("Patched auth.service.js successfully");
  } else {
    console.log("auth.service.js is already patched");
  }
};

const patchAstrologerLogin = () => {
  const astroControllerPath = path.resolve(__dirname, "../ASTROOO/src/controllers/astrologerLogin.controller.js");
  let content = fs.readFileSync(astroControllerPath, "utf8");
  if (!content.includes("generateRefreshToken")) {
    // 1. Update imports
    content = content.replace(
      'const { generateToken } = require("../utils/jwt");',
      'const { generateToken, generateRefreshToken } = require("../utils/jwt");'
    );

    // 2. Update register token output
    const registerTarget = `        // Generate JWT token
        const token = generateToken({
            userId: astrologer._id,
            role: "astrologer"
        });

        return res.status(201).json({
            success: true,
            message: "Astrologer registered successfully",
            token,
            astrologer
        });`;
    const registerReplacement = `        // Generate JWT token
        const token = generateToken({
            userId: astrologer._id,
            role: "astrologer"
        });
        const refreshToken = generateRefreshToken({
            userId: astrologer._id,
            role: "astrologer"
        });

        return res.status(201).json({
            success: true,
            message: "Astrologer registered successfully",
            token,
            refreshToken,
            astrologer
        });`;
    content = content.replace(registerTarget, registerReplacement);

    // 3. Update login token output
    const loginTarget = `        // Generate JWT token
        const token = generateToken({
            userId: astrologer._id,
            role: "astrologer"
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            astrologer
        });`;
    const loginReplacement = `        // Generate JWT token
        const token = generateToken({
            userId: astrologer._id,
            role: "astrologer"
        });
        const refreshToken = generateRefreshToken({
            userId: astrologer._id,
            role: "astrologer"
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            refreshToken,
            astrologer
        });`;
    content = content.replace(loginTarget, loginReplacement);

    fs.writeFileSync(astroControllerPath, content, "utf8");
    console.log("Patched astrologerLogin.controller.js successfully");
  } else {
    console.log("astrologerLogin.controller.js is already patched");
  }
};

try {
  patchRoutes();
  patchControllers();
  patchServices();
  patchAstrologerLogin();
  console.log("Backend successfully patched for token refresh!");
} catch (e) {
  console.error("Backend patch error:", e);
}
