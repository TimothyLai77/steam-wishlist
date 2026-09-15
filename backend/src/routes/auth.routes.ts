import { Router } from "express";
import { register, login, getProfile, updateProfile } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { loginLimiter, registerLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);

export default router;
