import express from"express";

const router = express.Router()

import { registerUser, loginUser,verifyOTP } from "../controllers/authController.js";

router.post('/register',registerUser); 
router.post('/login',loginUser); 
router.post('/verify-otp', verifyOTP);


export default router;