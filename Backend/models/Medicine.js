const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicineId: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    maxlength: [100, 'Medicine name cannot exceed 100 characters']
  },
  genericName: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Antibiotics', 'Analgesics', 'Antacids', 'Antihistamines',
      'Antihypertensives', 'Antidiabetics', 'Vitamins', 'Supplements',
      'Cardiac', 'Respiratory', 'Gastrointestinal', 'Neurological',
      'Dermatological', 'Ophthalmological', 'Emergency', 'Other'
    ]
  },
  form: {
    type: String,
    required: [true, 'Medicine form is required'],
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'spray', 'inhaler']
  },
  strength: {
    type: String,
    required: [true, 'Strength is required']
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required']
  },
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required']
  },
  manufacturingDate: {
    type: Date,
    required: [true, 'Manufacturing date is required']
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    validate: {
      validator: function(value) {
        return value > this.manufacturingDate;
      },
      message: 'Expiry date must be after manufacturing date'
    }
  },
  price: {
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    mrp: {
      type: Number,
      required: [true, 'MRP is required'],
      min: [0, 'MRP cannot be negative']
    }
  },
  stock: {
    current: {
      type: Number,
      required: [true, 'Current stock is required'],
      min: [0, 'Stock cannot be negative']
    },
    minimum: {
      type: Number,
      required: [true, 'Minimum stock level is required'],
      min: [0, 'Minimum stock cannot be negative']
    },
    maximum: {
      type: Number,
      required: [true, 'Maximum stock level is required'],
      min: [0, 'Maximum stock cannot be negative']
    }
  },
  supplier: {
    name: {
      type: String,
      required: [true, 'Supplier name is required']
    },
    contact: {
      type: String,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    email: {
      type: String,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    address: String
  },
  prescriptionRequired: {
    type: Boolean,
    default: false
  },
  sideEffects: [{
    type: String
  }],
  contraindications: [{
    type: String
  }],
  dosageInstructions: {
    type: String
  },
  storageInstructions: {
    type: String,
    default: 'Store in a cool, dry place'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  soldQuantity: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate medicine ID before saving
medicineSchema.pre('save', async function(next) {
  if (!this.medicineId) {
    const count = await this.constructor.countDocuments();
    this.medicineId = `MED${String(count + 1).padStart(6, '0')}`;
  }
  this.lastUpdated = new Date();
  next();
});

// Virtual for stock status
medicineSchema.virtual('stockStatus').get(function() {
  if (this.stock.current === 0) return 'out-of-stock';
  if (this.stock.current <= this.stock.minimum) return 'low-stock';
  return 'in-stock';
});

// Virtual for days until expiry
medicineSchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for profit margin
medicineSchema.virtual('profitMargin').get(function() {
  if (this.price.costPrice && this.price.sellingPrice) {
    return ((this.price.sellingPrice - this.price.costPrice) / this.price.costPrice * 100).toFixed(2);
  }
  return 0;
});

// Indexes
medicineSchema.index({ medicineId: 1 });
medicineSchema.index({ name: 1 });
medicineSchema.index({ category: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ 'stock.current': 1 });

// Compound index for search
medicineSchema.index({ name: 'text', genericName: 'text', brand: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
