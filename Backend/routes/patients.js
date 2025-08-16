const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/patients
// @desc    Get all patients (admin, doctor) or own patient data
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
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

    let query = {};

    // If user is a patient, only show their own data
    if (req.user.role === 'patient') {
      query.user = req.user.id;
    }

    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const users = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id');

      const userIds = users.map(user => user._id);
      query.$or = [
        { patientId: searchRegex },
        { user: { $in: userIds } }
      ];
    }

    const patients = await Patient.find(query)
      .populate('user', '-password')
      .populate('currentMedications.medicine')
      .populate('currentMedications.prescribedBy', 'firstName lastName specialization')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Patient.countDocuments(query);

    res.json({
      patients,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/patients/:id
// @desc    Get patient by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };

    // If user is a patient, only allow access to their own data
    if (req.user.role === 'patient') {
      query.user = req.user.id;
    }

    const patient = await Patient.findOne(query)
      .populate('user', '-password')
      .populate('currentMedications.medicine')
      .populate('currentMedications.prescribedBy', 'firstName lastName specialization')
      .populate('visits.doctor', 'firstName lastName specialization');

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(patient);

  } catch (error) {
    console.error('Get patient error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/patients
// @desc    Create new patient (admin only)
// @access  Private
router.post('/', [auth, authorize('admin')], [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
  body('emergencyContact.name').trim().isLength({ min: 2 }).withMessage('Emergency contact name is required'),
  body('emergencyContact.phone').isMobilePhone().withMessage('Valid emergency contact phone is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, phone, dateOfBirth, gender, address, emergencyContact, bloodGroup } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user account
    user = new User({
      firstName,
      lastName,
      email,
      password: 'patient123', // Default password
      role: 'patient',
      phone,
      dateOfBirth,
      gender,
      address
    });

    await user.save();

    // Create patient profile
    const patient = new Patient({
      user: user._id,
      emergencyContact,
      bloodGroup
    });

    await patient.save();

    const populatedPatient = await Patient.findById(patient._id).populate('user', '-password');

    res.status(201).json({
      message: 'Patient created successfully',
      patient: populatedPatient
    });

  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/patients/:id
// @desc    Update patient
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };

    // If user is a patient, only allow updating their own data
    if (req.user.role === 'patient') {
      query.user = req.user.id;
    }

    const patient = await Patient.findOne(query);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const { emergencyContact, medicalHistory, allergies, bloodGroup, height, weight, insuranceDetails } = req.body;

    // Update patient fields
    if (emergencyContact) patient.emergencyContact = emergencyContact;
    if (medicalHistory) patient.medicalHistory = medicalHistory;
    if (allergies) patient.allergies = allergies;
    if (bloodGroup) patient.bloodGroup = bloodGroup;
    if (height) patient.height = height;
    if (weight) patient.weight = weight;
    if (insuranceDetails) patient.insuranceDetails = insuranceDetails;

    await patient.save();

    const updatedPatient = await Patient.findById(patient._id)
      .populate('user', '-password')
      .populate('currentMedications.medicine')
      .populate('currentMedications.prescribedBy', 'firstName lastName specialization');

    res.json({
      message: 'Patient updated successfully',
      patient: updatedPatient
    });

  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/patients/:id/medical-history
// @desc    Add medical history entry
// @access  Private (doctors, admin, own patient)
router.post('/:id/medical-history', auth, [
  body('condition').trim().isLength({ min: 2 }).withMessage('Condition is required'),
  body('diagnosedDate').isISO8601().withMessage('Valid diagnosed date is required'),
  body('status').optional().isIn(['active', 'resolved', 'chronic'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let query = { _id: req.params.id };

    // If user is a patient, only allow updating their own data
    if (req.user.role === 'patient') {
      query.user = req.user.id;
    }

    const patient = await Patient.findOne(query);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const { condition, diagnosedDate, status, notes } = req.body;

    patient.medicalHistory.push({
      condition,
      diagnosedDate,
      status: status || 'active',
      notes
    });

    await patient.save();

    res.json({
      message: 'Medical history added successfully',
      patient
    });

  } catch (error) {
    console.error('Add medical history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/patients/:id/visit
// @desc    Add visit record (doctors only)
// @access  Private
router.post('/:id/visit', [auth, authorize('doctor', 'admin')], [
  body('diagnosis').optional().trim().isLength({ max: 500 }),
  body('treatment').optional().trim().isLength({ max: 500 }),
  body('notes').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const { diagnosis, treatment, prescription, followUpDate, notes } = req.body;

    patient.visits.push({
      doctor: req.user.id,
      diagnosis,
      treatment,
      prescription: prescription || [],
      followUpDate,
      notes,
      date: new Date()
    });

    await patient.save();

    const updatedPatient = await Patient.findById(patient._id)
      .populate('visits.doctor', 'firstName lastName specialization');

    res.json({
      message: 'Visit record added successfully',
      patient: updatedPatient
    });

  } catch (error) {
    console.error('Add visit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/patients/:id
// @desc    Delete patient (admin only)
// @access  Private
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Also delete the associated user account
    await User.findByIdAndDelete(patient.user);
    await Patient.findByIdAndDelete(req.params.id);

    res.json({ message: 'Patient deleted successfully' });

  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
