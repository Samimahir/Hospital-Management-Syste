const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/doctors
// @desc    Get all doctors
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('specialization').optional().isLength({ max: 50 }),
  query('search').optional().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const specialization = req.query.specialization;

    let query = { isAvailable: true };

    // Filter by specialization
    if (specialization) {
      query.specialization = specialization;
    }

    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const users = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex }
        ]
      }).select('_id');

      const userIds = users.map(user => user._id);
      query.$or = [
        { doctorId: searchRegex },
        { specialization: searchRegex },
        { user: { $in: userIds } }
      ];
    }

    const doctors = await Doctor.find(query)
      .populate('user', '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Doctor.countDocuments(query);

    res.json({
      doctors,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/doctors/specializations
// @desc    Get all specializations
// @access  Private
router.get('/specializations', auth, async (req, res) => {
  try {
    const specializations = await Doctor.distinct('specialization');
    res.json(specializations);
  } catch (error) {
    console.error('Get specializations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/doctors/:id
// @desc    Get doctor by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('user', '-password');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);

  } catch (error) {
    console.error('Get doctor error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/doctors
// @desc    Create new doctor (admin only)
// @access  Private
router.post('/', [auth, authorize('admin')], [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('specialization').isIn([
    'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
    'General Medicine', 'Gynecology', 'Neurology', 'Oncology',
    'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology',
    'Surgery', 'Urology', 'Emergency Medicine', 'Anesthesiology'
  ]).withMessage('Valid specialization is required'),
  body('experience').isInt({ min: 0 }).withMessage('Experience must be a positive number'),
  body('licenseNumber').trim().isLength({ min: 5 }).withMessage('License number is required'),
  body('consultationFee').isFloat({ min: 0 }).withMessage('Consultation fee must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      firstName, lastName, email, phone, dateOfBirth, gender, address,
      specialization, qualifications, experience, licenseNumber, 
      consultationFee, availability, department, room, about 
    } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if license number already exists
    const existingDoctor = await Doctor.findOne({ licenseNumber });
    if (existingDoctor) {
      return res.status(400).json({ message: 'Doctor with this license number already exists' });
    }

    // Create user account
    user = new User({
      firstName,
      lastName,
      email,
      password: 'doctor123', // Default password
      role: 'doctor',
      phone,
      dateOfBirth,
      gender,
      address
    });

    await user.save();

    // Create doctor profile
    const doctor = new Doctor({
      user: user._id,
      specialization,
      qualifications: qualifications || [],
      experience,
      licenseNumber,
      consultationFee,
      availability: availability || [],
      department: department || specialization,
      room: room || 'TBD',
      about
    });

    await doctor.save();

    const populatedDoctor = await Doctor.findById(doctor._id).populate('user', '-password');

    res.status(201).json({
      message: 'Doctor created successfully',
      doctor: populatedDoctor
    });

  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/doctors/:id
// @desc    Update doctor
// @access  Private (admin or own profile)
router.put('/:id', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };

    // If user is a doctor, only allow updating their own profile
    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: req.user.id });
      if (!doctorProfile || doctorProfile._id.toString() !== req.params.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const { 
      specialization, qualifications, experience, consultationFee, 
      availability, department, room, about, isAvailable 
    } = req.body;

    // Update doctor fields
    if (specialization) doctor.specialization = specialization;
    if (qualifications) doctor.qualifications = qualifications;
    if (experience !== undefined) doctor.experience = experience;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (availability) doctor.availability = availability;
    if (department) doctor.department = department;
    if (room) doctor.room = room;
    if (about !== undefined) doctor.about = about;
    if (isAvailable !== undefined) doctor.isAvailable = isAvailable;

    await doctor.save();

    const updatedDoctor = await Doctor.findById(doctor._id).populate('user', '-password');

    res.json({
      message: 'Doctor updated successfully',
      doctor: updatedDoctor
    });

  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/doctors/:id/availability
// @desc    Check doctor availability for a specific date
// @access  Private
router.get('/:id/availability/:date', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const date = new Date(req.params.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    const dayAvailability = doctor.availability.find(avail => avail.day === dayName);

    if (!dayAvailability) {
      return res.json({ available: false, message: 'Doctor not available on this day' });
    }

    // You can add more logic here to check for existing appointments
    // and return available time slots

    res.json({
      available: true,
      day: dayName,
      timeSlot: {
        startTime: dayAvailability.startTime,
        endTime: dayAvailability.endTime
      }
    });

  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/doctors/:id
// @desc    Delete doctor (admin only)
// @access  Private
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Also delete the associated user account
    await User.findByIdAndDelete(doctor.user);
    await Doctor.findByIdAndDelete(req.params.id);

    res.json({ message: 'Doctor deleted successfully' });

  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
