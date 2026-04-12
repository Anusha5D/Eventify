import express from 'express';

const router = express.Router();

import  { protect,admin } from '../middleware/auth.js';

import { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent } from '../controllers/eventController.js';

// / syntax of router.method (the id, middleware, controller function)

// get all events
router.get('/', getAllEvents);

// get event by id 
router.get('/:id', getEventById);

// create event - only admins can create events, so we will use both protect and admin middleware to secure this route
router.post('/', protect, admin, createEvent);

// update event - only admins can update events, so we will use both protect and admin middleware to secure this route
router.put('/:id', protect, admin, updateEvent);


// delete event - only admins can delete events, so we will use both protect and admin middleware to secure this route
router.delete('/:id', protect, admin, deleteEvent);

export default router;

