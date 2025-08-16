const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/appointments
// @desc    Get appointments (filtered by user role)
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']),
  query('date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const date = req.query.date;

    let query = {};

    // Filter based on user role
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      if (patient) {
        query.patient = patient._id;
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user.id });
      if (doctor) {
        query.doctor = doctor._id;
      }
    }

    // Add filters
    if (status) {
      query.status = status;
    }

    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      query.appointmentDate = {
        $gte: targetDate,
        $lt: nextDate
      };
    }

    const appointments = await Appointment.find(query)
      .populate('patient', 'patientId emergencyContact')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'firstName lastName email phone'
        }
      })
      .populate('doctor', 'doctorId specialization consultationFee')
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'firstName lastName email phone'
        }
      })
      .populate('prescription.medicine')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'patientId emergencyContact medicalHistory allergies')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'firstName lastName email phone dateOfBirth gender address'
        }
      })
      .populate('doctor', 'doctorId specialization consultationFee department')
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'firstName lastName email phone'
        }
      })
      .populate('prescription.medicine');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check access permissions
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      if (!patient || appointment.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user.id });
      if (!doctor || appointment.doctor._id.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(appointment);

  } catch (error) {
    console.error('Get appointment error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private
router.post('/', auth, [
  body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required (HH:MM)'),
  body('reasonForVisit').trim().isLength({ min: 5, max: 500 }).withMessage('Reason for visit is required'),
  body('type').optional().isIn(['consultation', 'follow-up', 'emergency', 'surgery', 'check-up'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { doctorId, appointmentDate, appointmentTime, reasonForVisit, symptoms, type } = req.body;

    // Find patient based on user
    let patient;
    if (req.user.role === 'patient') {
      patient = await Patient.findOne({ user: req.user.id });
      if (!patient) {
        return res.status(400).json({ message: 'Patient profile not found' });
      }
    } else if (req.user.role === 'admin' && req.body.patientId) {
      patient = await Patient.findById(req.body.patientId);
      if (!patient) {
        return res.status(400).json({ message: 'Patient not found' });
      }
    } else {
      return res.status(400).json({ message: 'Patient information required' });
    }

    // Find doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(400).json({ message: 'Doctor not found' });
    }

    // Check if doctor is available
    if (!doctor.isAvailable) {
      return res.status(400).json({ message: 'Doctor is currently not available' });
    }

    // Check appointment date is not in the past
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    if (appointmentDateTime < new Date()) {
      return res.status(400).json({ message: 'Cannot book appointment in the past' });
    }

    // Check for conflicting appointments
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    // Create appointment
    const appointment = new Appointment({
      patient: patient._id,
      doctor: doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      reasonForVisit,
      symptoms: symptoms || [],
      type: type || 'consultation',
      consultationFee: doctor.consultationFee
    });

    await appointment.save();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patient', 'patientId')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'firstName lastName email phone'
        }
      })
      .populate('doctor', 'doctorId specialization')
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: populatedAppointment
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id
// @desc    Update appointment
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    let hasPermission = false;
    if (req.user.role === 'admin') {
      hasPermission = true;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user.id });
      hasPermission = doctor && appointment.doctor.toString() === doctor._id.toString();
    } else if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      hasPermission = patient && appointment.patient.toString() === patient._id.toString();
    }

    if (!hasPermission) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { 
      status, diagnosis, treatment, prescription, followUpDate, 
      notes, paymentStatus, paymentMethod, cancellationReason 
    } = req.body;

    // Update fields based on role
    if (req.user.role === 'doctor' || req.user.role === 'admin') {
      if (status) appointment.status = status;
      if (diagnosis) appointment.diagnosis = diagnosis;
      if (treatment) appointment.treatment = treatment;
      if (prescription) appointment.prescription = prescription;
      if (followUpDate) appointment.followUpDate = followUpDate;
      if (notes) appointment.notes = notes;
      if (paymentStatus) appointment.paymentStatus = paymentStatus;
      if (paymentMethod) appointment.paymentMethod = paymentMethod;
    }

    // Patients can only cancel appointments
    if (req.user.role === 'patient') {
      if (status === 'cancelled') {
        appointment.status = 'cancelled';
        appointment.cancelledBy = 'patient';
        if (cancellationReason) appointment.cancellationReason = cancellationReason;
      } else {
        return res.status(403).json({ message: 'Patients can only cancel appointments' });
      }
    }

    await appointment.save();

    const updatedAppointment = await Appointment.findById(appointment._id)
      .populate('patient', 'patientId')
      .populate({
        path: 'patient',
        populate: {
          path: 'user',
          select: 'firstName lastName email phone'
        }
      })
      .populate('doctor', 'doctorId specialization')
      .populate({
        path: 'doctor',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .populate('prescription.medicine');

    res.json({
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/appointments/:id
// @desc    Delete appointment (admin only)
// @access  Private
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Appointment deleted successfully' });

  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/stats/dashboard
// @desc    Get appointment statistics
// @access  Private
router.get('/stats/dashboard', [auth, authorize('admin', 'doctor')], async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    let matchQuery = {};
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user.id });
      if (doctor) {
        matchQuery.doctor = doctor._id;
      }
    }

    const stats = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          todayAppointments: [
            {
              $match: {
                appointmentDate: { $gte: startOfDay, $lte: endOfDay }
              }
            },
            { $count: "count" }
          ],
          totalAppointments: [
            { $count: "count" }
          ],
          statusDistribution: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 }
              }
            }
          ],
          recentAppointments: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "patients",
                localField: "patient",
                foreignField: "_id",
                as: "patientInfo"
              }
            }
          ]
        }
      }
    ]);

    res.json({
      todayCount: stats[0].todayAppointments[0]?.count || 0,
      totalCount: stats[0].totalAppointments[0]?.count || 0,
      statusDistribution: stats[0].statusDistribution,
      recentAppointments: stats[0].recentAppointments
    });

  } catch (error) {
    console.error('Get appointment stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
