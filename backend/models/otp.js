import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
    },
    otp:{
        type: String,
        required: true, 
    },
     action: { 
        type: String,
        enum:['account_verification', 'event_booking','booking_confirmation'],
        required: true,  
     },
     createdAt: {
        type: Date,
        default: Date.now,
        expires: 300, // OTP expires after 5 minutes
     }
});

export default mongoose.models.OTP || mongoose.model('OTP', otpSchema);