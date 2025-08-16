const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Medicine = require('../models/Medicine');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/medicines
// @desc    Get all medicines
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isLength({ max: 50 }),
  query('search').optional().isLength({ max: 100 }),
  query('lowStock').optional().isBoolean()
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
    const category = req.query.category;
    const lowStock = req.query.lowStock === 'true';

    let query = { isActive: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter for low stock medicines
    if (lowStock) {
      query.$expr = { $lte: ["$stock.current", "$stock.minimum"] };
    }

    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { genericName: searchRegex },
        { brand: searchRegex },
        { manufacturer: searchRegex }
      ];
    }

    const medicines = await Medicine.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Medicine.countDocuments(query);

    // Add virtual fields to response
    const medicinesWithVirtuals = medicines.map(medicine => {
      const medicineObj = medicine.toObject({ virtuals: true });
      return medicineObj;
    });

    res.json({
      medicines: medicinesWithVirtuals,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get medicines error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/medicines/categories
// @desc    Get all medicine categories
// @access  Private
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await Medicine.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/medicines/low-stock
// @desc    Get medicines with low stock
// @access  Private
router.get('/low-stock', [auth, authorize('admin', 'pharmacist')], async (req, res) => {
  try {
    const lowStockMedicines = await Medicine.find({
      $expr: { $lte: ["$stock.current", "$stock.minimum"] },
      isActive: true
    }).sort({ 'stock.current': 1 });

    res.json(lowStockMedicines);
  } catch (error) {
    console.error('Get low stock medicines error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/medicines/expiring
// @desc    Get medicines expiring soon
// @access  Private
router.get('/expiring', [auth, authorize('admin', 'pharmacist')], async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiringMedicines = await Medicine.find({
      expiryDate: { $lte: futureDate },
      isActive: true
    }).sort({ expiryDate: 1 });

    res.json(expiringMedicines);
  } catch (error) {
    console.error('Get expiring medicines error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/medicines/:id
// @desc    Get medicine by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    const medicineWithVirtuals = medicine.toObject({ virtuals: true });
    res.json(medicineWithVirtuals);

  } catch (error) {
    console.error('Get medicine error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/medicines
// @desc    Create new medicine (admin, pharmacist only)
// @access  Private
router.post('/', [auth, authorize('admin', 'pharmacist')], [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Medicine name is required'),
  body('brand').trim().isLength({ min: 2 }).withMessage('Brand is required'),
  body('category').isIn([
    'Antibiotics', 'Analgesics', 'Antacids', 'Antihistamines',
    'Antihypertensives', 'Antidiabetics', 'Vitamins', 'Supplements',
    'Cardiac', 'Respiratory', 'Gastrointestinal', 'Neurological',
    'Dermatological', 'Ophthalmological', 'Emergency', 'Other'
  ]).withMessage('Valid category is required'),
  body('form').isIn(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'spray', 'inhaler']).withMessage('Valid form is required'),
  body('strength').trim().isLength({ min: 1 }).withMessage('Strength is required'),
  body('manufacturer').trim().isLength({ min: 2 }).withMessage('Manufacturer is required'),
  body('batchNumber').trim().isLength({ min: 1 }).withMessage('Batch number is required'),
  body('manufacturingDate').isISO8601().withMessage('Valid manufacturing date is required'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
  body('price.costPrice').isFloat({ min: 0 }).withMessage('Cost price must be positive'),
  body('price.sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be positive'),
  body('price.mrp').isFloat({ min: 0 }).withMessage('MRP must be positive'),
  body('stock.current').isInt({ min: 0 }).withMessage('Current stock must be non-negative'),
  body('stock.minimum').isInt({ min: 0 }).withMessage('Minimum stock must be non-negative'),
  body('stock.maximum').isInt({ min: 0 }).withMessage('Maximum stock must be non-negative'),
  body('supplier.name').trim().isLength({ min: 2 }).withMessage('Supplier name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const medicineData = req.body;

    // Validate expiry date is after manufacturing date
    if (new Date(medicineData.expiryDate) <= new Date(medicineData.manufacturingDate)) {
      return res.status(400).json({ message: 'Expiry date must be after manufacturing date' });
    }

    // Validate stock levels
    if (medicineData.stock.minimum > medicineData.stock.maximum) {
      return res.status(400).json({ message: 'Minimum stock cannot be greater than maximum stock' });
    }

    const medicine = new Medicine(medicineData);
    await medicine.save();

    const medicineWithVirtuals = medicine.toObject({ virtuals: true });

    res.status(201).json({
      message: 'Medicine created successfully',
      medicine: medicineWithVirtuals
    });

  } catch (error) {
    console.error('Create medicine error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Medicine with this batch number already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/medicines/:id
// @desc    Update medicine (admin, pharmacist only)
// @access  Private
router.put('/:id', [auth, authorize('admin', 'pharmacist')], async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    const updateData = req.body;

    // Validate dates if provided
    if (updateData.expiryDate && updateData.manufacturingDate) {
      if (new Date(updateData.expiryDate) <= new Date(updateData.manufacturingDate)) {
        return res.status(400).json({ message: 'Expiry date must be after manufacturing date' });
      }
    }

    // Validate stock levels if provided
    if (updateData.stock) {
      const newStock = { ...medicine.stock.toObject(), ...updateData.stock };
      if (newStock.minimum > newStock.maximum) {
        return res.status(400).json({ message: 'Minimum stock cannot be greater than maximum stock' });
      }
    }

    Object.keys(updateData).forEach(key => {
      if (key === 'stock' || key === 'price' || key === 'supplier') {
        medicine[key] = { ...medicine[key].toObject(), ...updateData[key] };
      } else {
        medicine[key] = updateData[key];
      }
    });

    await medicine.save();

    const medicineWithVirtuals = medicine.toObject({ virtuals: true });

    res.json({
      message: 'Medicine updated successfully',
      medicine: medicineWithVirtuals
    });

  } catch (error) {
    console.error('Update medicine error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/medicines/:id/stock
// @desc    Update medicine stock (admin, pharmacist only)
// @access  Private
router.put('/:id/stock', [auth, authorize('admin', 'pharmacist')], [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('type').isIn(['add', 'subtract']).withMessage('Type must be add or subtract')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { quantity, type, reason } = req.body;

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    if (type === 'add') {
      medicine.stock.current += quantity;
    } else {
      if (medicine.stock.current < quantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
      }
      medicine.stock.current -= quantity;
      medicine.soldQuantity += quantity;
    }

    await medicine.save();

    const medicineWithVirtuals = medicine.toObject({ virtuals: true });

    res.json({
      message: `Stock ${type === 'add' ? 'added' : 'updated'} successfully`,
      medicine: medicineWithVirtuals
    });

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/medicines/:id
// @desc    Delete medicine (admin only)
// @access  Private
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    // Soft delete - mark as inactive instead of deleting
    medicine.isActive = false;
    await medicine.save();

    res.json({ message: 'Medicine deactivated successfully' });

  } catch (error) {
    console.error('Delete medicine error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/medicines/stats/dashboard
// @desc    Get medicine statistics
// @access  Private
router.get('/stats/dashboard', [auth, authorize('admin', 'pharmacist')], async (req, res) => {
  try {
    const stats = await Medicine.aggregate([
      { $match: { isActive: true } },
      {
        $facet: {
          totalMedicines: [
            { $count: "count" }
          ],
          lowStockCount: [
            {
              $match: {
                $expr: { $lte: ["$stock.current", "$stock.minimum"] }
              }
            },
            { $count: "count" }
          ],
          expiringSoon: [
            {
              $match: {
                expiryDate: { 
                  $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
                }
              }
            },
            { $count: "count" }
          ],
          outOfStock: [
            {
              $match: { "stock.current": 0 }
            },
            { $count: "count" }
          ],
          categoryDistribution: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
                totalValue: { $sum: { $multiply: ["$stock.current", "$price.sellingPrice"] } }
              }
            },
            { $sort: { count: -1 } }
          ],
          topSelling: [
            { $sort: { soldQuantity: -1 } },
            { $limit: 5 },
            {
              $project: {
                name: 1,
                brand: 1,
                soldQuantity: 1,
                "stock.current": 1
              }
            }
          ]
        }
      }
    ]);

    res.json({
      totalCount: stats[0].totalMedicines[0]?.count || 0,
      lowStockCount: stats[0].lowStockCount[0]?.count || 0,
      expiringSoonCount: stats[0].expiringSoon[0]?.count || 0,
      outOfStockCount: stats[0].outOfStock[0]?.count || 0,
      categoryDistribution: stats[0].categoryDistribution,
      topSelling: stats[0].topSelling
    });

  } catch (error) {
    console.error('Get medicine stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
