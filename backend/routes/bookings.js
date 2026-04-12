import express from 'express';

const router = express.Router();

import { protect, admin } from '../middleware/auth.js';

import  {bookEvent, confirmBooking, getMyBookings, cancelBooking, sendBookingOTP} from '../controllers/bookingController.js';

router.post('/send-otp',protect, sendBookingOTP);
router.post('/', protect, bookEvent);
router.post('/:id/confirm', protect,admin, confirmBooking);
router.get('/my', protect, getMyBookings);
router.delete('/:id', protect, cancelBooking);


export default router;