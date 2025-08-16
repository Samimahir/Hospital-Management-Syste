const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientId: {
    type: String,
    unique: true,
    required: true
  },
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Emergency contact name is required']
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required']
    },
    phone: {
      type: String,
      required: [true, 'Emergency contact phone is required'],
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    }
  },
  medicalHistory: [{
    condition: {
      type: String,
      required: true
    },
    diagnosedDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic'],
      default: 'active'
    },
    notes: String
  }],
  allergies: [{
    allergen: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'mild'
    },
    reaction: String
  }],
  currentMedications: [{
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine'
    },
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    }
  }],
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  height: {
    type: Number, // in cm
    min: [0, 'Height must be positive']
  },
  weight: {
    type: Number, // in kg
    min: [0, 'Weight must be positive']
  },
  insuranceDetails: {
    provider: String,
    policyNumber: String,
    expiryDate: Date
  },
  visits: [{
    date: {
      type: Date,
      default: Date.now
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    },
    diagnosis: String,
    treatment: String,
    prescription: [{
      medicine: String,
      dosage: String,
      duration: String
    }],
    followUpDate: Date,
    notes: String
  }]
}, {
  timestamps: true
});

// Generate patient ID before saving
patientSchema.pre('save', async function(next) {
  if (!this.patientId) {
    const count = await this.constructor.countDocuments();
    this.patientId = `PAT${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Virtual for BMI calculation
patientSchema.virtual('bmi').get(function() {
  if (this.height && this.weight) {
    const heightInM = this.height / 100;
    return (this.weight / (heightInM * heightInM)).toFixed(2);
  }
  return null;
});

// Indexes
patientSchema.index({ patientId: 1 });
patientSchema.index({ user: 1 });

module.exports = mongoose.model('Patient', patientSchema);
