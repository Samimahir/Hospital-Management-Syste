const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor is required']
  },
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: ['consultation', 'follow-up', 'emergency', 'surgery', 'check-up'],
    default: 'consultation'
  },
  reasonForVisit: {
    type: String,
    required: [true, 'Reason for visit is required'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  symptoms: [{
    type: String
  }],
  diagnosis: {
    type: String
  },
  treatment: {
    type: String
  },
  prescription: [{
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine'
    },
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String
  }],
  followUpDate: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  consultationFee: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'insurance']
  },
  cancellationReason: {
    type: String
  },
  cancelledBy: {
    type: String,
    enum: ['patient', 'doctor', 'admin']
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate appointment ID before saving
appointmentSchema.pre('save', async function(next) {
  if (!this.appointmentId) {
    const count = await this.constructor.countDocuments();
    this.appointmentId = `APT${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Prevent double booking validation
appointmentSchema.pre('save', async function(next) {
  if (this.isModified('appointmentDate') || this.isModified('appointmentTime') || this.isModified('doctor')) {
    const existingAppointment = await this.constructor.findOne({
      doctor: this.doctor,
      appointmentDate: this.appointmentDate,
      appointmentTime: this.appointmentTime,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] },
      _id: { $ne: this._id }
    });

    if (existingAppointment) {
      const error = new Error('Doctor is not available at this time slot');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

// Indexes
appointmentSchema.index({ appointmentId: 1 });
appointmentSchema.index({ patient: 1 });
appointmentSchema.index({ doctor: 1 });
appointmentSchema.index({ appointmentDate: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
