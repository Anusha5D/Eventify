import User from '../models/User.js';
import OTP from '../models/otp.js';
import bcrypt from 'bcryptjs';
import { sendOTPEmail } from '../utils/email.js'; 
import jwt from 'jsonwebtoken';


// GENERATE TOKEN
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

//Register user
export const registerUser = async (req, res) => 
{
    const { name, email, password } = req.body;

    let userExists = await User.findOne({email});
    if(userExists){
        return res.status(400).json({message: 'User already exists'});
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try{
        // step1 - create user with isVerified false in DB
        const user = await User.create({name,email,password:hashedPassword,role:'user',isVerified:false});
   
        // step2 - generate OTP and save in DB
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
        console.log(`Generated OTP for ${email}: ${otp}`); 
        await OTP.create({email, otp, action: 'account_verification'});

        // step3 - send OTP to user's email
        await sendOTPEmail(email, otp, 'account_verification');

        // step4 - respond to client
        res.status(201).json({message: 'User registered successfully. Please check your email for the OTP to verify your account.',
            email: user.email
        });

    }
    catch(error){
        res.status(400).json({message: error.message});
    }
}

//Login user
export const loginUser = async (req,res) =>
{
try
{
    console.log("BODY:", req.body); 
    const {email,password} = req.body;

    let user = await User.findOne({email});
    if(!user){
        return res.status(400).json({message: 'Invalid credentials. Please sign up first.'});
    }

    // password is compared using bcrypt because it is stored in hashed form in the database for security reasons.
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
        return res.status(400).json({message: 'Invalid credentials. Please try again.'});
    }
    
    //delete any existing OTPs for account verification to avoid confusion
    if(!user.isVerified && user.role === 'user'){
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
        await OTP.deleteMany({email, action: 'account_verification'}); // Remove any existing OTPs for this email
        await OTP.create({email, otp, action: 'account_verification'});   
        await sendOTPEmail(email, otp, 'account_verification');

    }
    res.status(200).json({
        message: 'Login successful',
        _id: user._id,
        name: user.name,
        email: user.email,  
        role: user.role,
        token: generateToken(user._id, user.role),
    });

} 
catch(error)
{
    console.log(error);   
    res.status(500).json({message: error.message});
}

}

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const validOTP = await OTP.findOne({ email, otp, action: 'account_verification' });

        if (!validOTP) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
        await OTP.deleteOne({ _id: validOTP._id }); // Delete OTP after usage

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

