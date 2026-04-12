import Booking from '../models/Bookings.js';
import Event from '../models/Event.js';
import  OTP from '../models/otp.js';
import { sendBookingEmail, sendOTPEmail } from '../utils/email.js';


const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendBookingOTP = async (req, res) => {
    try
    {
        const otp = generateOTP();
        await OTP.findOneAndDelete({ email: req.user.email, action: 'booking_confirmation' });
        await OTP.create({ email: req.user.email, otp, action: 'booking_confirmation' });
        await sendOTPEmail(req.user.email, otp, 'booking_confirmation');
        res.status(200).json({ message: 'OTP sent to your email for booking confirmation.' });
    } 
    catch(error)
    {
        console.error(error);
        res.status(500).json({ message: 'Error sending OTP.' });
    }
        
}

//yaha verify karna hai ki jo otp user ne dala hai wo sahi hai ya nahi, agar sahi hai to booking confirm kar deni hai, aur email bhejna hai user ko booking confirmation ka.
export const bookEvent=async(req,res)=>
{
    try
    {
       const {eventId,otp} = req.body;
       
       //verify otp 
       const validOTP = await OTP.findOne({ email: req.user.email, otp, action: 'booking_confirmation' });
       if(!validOTP)
       {
        return res.status(400).json({message: 'Invalid OTP. Please try again.'});
       }
       // event ko verify karna hai ki wo exist karta hai ya nahi, aur uske available seats check karni hai.
         const event = await Event.findById(eventId);
         if(!event)
         {
            return res.status(404).json({message: 'Event not found.'});
         }
        // available seats check karna hai
        if(event.availableSeats <= 0)
        {
                return res.status(400).json({message: 'No seats available for this event.'});
        }
        //ab check karna hai ki user ne already is event ke liye booking ki hai ya nahi, agar ki hai to uska status check karna hai, agar status confirmed hai to user ko batana hai ki aapne already is event ke liye booking kar rakhi hai.
        const existingBooking = await Booking.findOne({ userId: req.user._id, eventId });
        if(existingBooking && existingBooking.status === 'confirmed')
        {
            return res.status(400).json({message: 'You have already booked this event.'});
        }
        //ab booking create karni hai, aur event ke available seats ko update karna hai.
        const booking = await Booking.create({
            userId: req.user._id,
            eventId,
            status: 'pending',
            paymentStatus: 'not_paid',
            amount: event.ticketPrice});
        
        //validOTP._id is used to uniquely identify the OTP document in the database. By deleting the OTP document after it has been used for booking confirmation, we ensure that the same OTP cannot be reused for another booking, thus enhancing security.
        await OTP.deleteOne({ _id: validOTP._id });

        //id vs _id: id is the string representation of the ObjectId, while _id is the actual ObjectId stored in the database. When we create a new booking, MongoDB automatically generates an _id for it. We can use this _id to reference the booking in other parts of our application, such as when confirming the booking or retrieving booking details.
        res.status(201).json({message: 'Booking request submitted. Please wait for confirmation from the admin.', booking});

    }
    catch(error)
    {
        console.error(error);
        res.status(500).json({ message: 'Error occurred while booking the event.' });
    }
}

export const confirmBooking = async (req, res) => {
    try
    {
    
      const { paymentStatus } = req.body; // 'paid' or 'not_paid'
        const booking = await Booking.findById(req.params.id).populate('userId').populate('eventId');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.status === 'confirmed') return res.status(400).json({ message: 'Booking is already confirmed' });

        const event = await Event.findById(booking.eventId._id);
        if (event.availableSeats <= 0) {
            return res.status(400).json({ message: 'No seats available to confirm this booking' });
        }

        booking.status = 'confirmed';
        if (paymentStatus) {
            booking.paymentStatus = paymentStatus;
        }
        await booking.save();

        event.availableSeats -= 1;
        await event.save();

        // Send email on admin confirmation
        await sendBookingEmail(booking.userId.email, booking.userId.name, booking.eventId.title);

        res.json({ message: 'Booking confirmed successfully', booking });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const getMyBookings = async (req, res) => {
    try {
        const bookings = req.user.role === 'admin'
            ? await Booking.find().populate('eventId').populate('userId', 'name email').sort({ createdAt: -1 })
            : await Booking.find({ userId: req.user.id }).populate('eventId').sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

export const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (booking.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

        const wasConfirmed = booking.status === 'confirmed';

        booking.status = 'cancelled';
        await booking.save();

        // Only restore the seat if it was actually confirmed and deducted
        if (wasConfirmed) {
            const event = await Event.findById(booking.eventId);
            if (event) {
                event.availableSeats += 1;
                await event.save();
            }
        }

        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};




    




