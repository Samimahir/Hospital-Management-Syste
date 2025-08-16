import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

// Currency formatter for Indian Rupee
const formatCurrency = (amount) => `₹${amount}`;

// Default medicines list
const medicinesData = [
  {
    id: 1,
    name: "Paracetamol 500mg",
    description: "Pain relief and fever reducer",
    manufacturer: "Generic Pharma",
    stockStatus: "In Stock",
    price: 25,
    prescriptionRequired: false,
    outOfStock: false,
  },
  {
    id: 2,
    name: "Amoxicillin 250mg",
    description: "Antibiotic for bacterial infections",
    manufacturer: "MedLife",
    stockStatus: "In Stock",
    price: 150,
    prescriptionRequired: true,
    outOfStock: false,
  },
  {
    id: 3,
    name: "Crocin Advance",
    description: "Fast acting pain relief",
    manufacturer: "GSK",
    stockStatus: "In Stock",
    price: 45,
    prescriptionRequired: false,
    outOfStock: false,
  },
  {
    id: 4,
    name: "Dolo 650",
    description: "Fever and pain management",
    manufacturer: "Micro Labs",
    stockStatus: "Out of Stock",
    price: 30,
    prescriptionRequired: false,
    outOfStock: true,
  },
  {
    id: 5,
    name: "Azithromycin 500mg",
    description: "Broad spectrum antibiotic",
    manufacturer: "Sun Pharma",
    stockStatus: "In Stock",
    price: 120,
    prescriptionRequired: true,
    outOfStock: false,
  },
  {
    id: 6,
    name: "Cetirizine 10mg",
    description: "Allergy relief medication",
    manufacturer: "Cipla",
    stockStatus: "In Stock",
    price: 35,
    prescriptionRequired: false,
    outOfStock: false,
  },
];

// Styles
const styles = {
  container: {
    padding: 20,
    backgroundColor: "#f8f9fa",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    minHeight: "100vh",
  },
  addButtonContainer: {
    marginBottom: 20,
    textAlign: "right",
  },
  addButton: {
    backgroundColor: "#007bff",
    color: "white",
    padding: "12px 24px",
    fontSize: 16,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 280,
    userSelect: "none",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
    color: "#555",
  },
  manufacturer: {
    fontSize: 13,
    color: "#777",
    marginBottom: 10,
  },
  stockStatus: {
    fontWeight: "600",
    marginBottom: 10,
  },
  prescriptionText: {
    color: "#cc0000",
    fontWeight: "bold",
    fontSize: 12,
    marginLeft: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },
  buttonsContainer: {
    display: "flex",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: "600",
    borderRadius: 6,
    userSelect: "none",
    border: "none",
    cursor: "pointer",
  },
  addToCartBtn: {
    backgroundColor: "#007bff",
    color: "white",
    marginRight: 12,
    transition: "background-color 0.3s ease",
  },
  addToCartBtnDisabled: {
    backgroundColor: "#6c757d",
    cursor: "not-allowed",
  },
  detailsBtn: {
    backgroundColor: "#6c757d",
    color: "white",
    transition: "background-color 0.3s ease",
  },
  formOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  formContainer: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 10,
    width: 400,
    boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    width: "100%",
    padding: 8,
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 14,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: 8,
    borderRadius: 4,
    border: "1px solid #ccc",
    fontSize: 14,
    boxSizing: "border-box",
    resize: "vertical",
  },
  formButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  btnSave: {
    backgroundColor: "#28a745",
    color: "white",
    padding: "10px 24px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
  },
  btnCancel: {
    backgroundColor: "#6c757d",
    color: "white",
    padding: "10px 24px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
  },
};

const Medicines = () => {
  const { user } = useAuth();

  // Dynamic medicines list state
  const [medicines, setMedicines] = useState(medicinesData);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMedicine, setNewMedicine] = useState({
    name: "",
    expiryDate: "",
    price: "",
    description: "",
  });

  // Check user role for permission
  const userRole = user?.role || "patient";

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewMedicine((prev) => ({ ...prev, [name]: value }));
  };

  // Form submission — add medicine
  const handleSubmit = (e) => {
    e.preventDefault();
    const { name, expiryDate, price, description } = newMedicine;
    if (!name || !expiryDate || !price || !description) {
      alert("Please fill in all fields");
      return;
    }
    if (isNaN(price) || Number(price) <= 0) {
      alert("Please enter a valid price");
      return;
    }

    const medicine = {
      id: medicines.length ? medicines[medicines.length - 1].id + 1 : 1,
      name,
      expiryDate,
      price: Number(price),
      description,
      manufacturer: "Generic Pharma",
      stockStatus: "In Stock",
      prescriptionRequired: false,
      outOfStock: false,
    };

    setMedicines((prev) => [...prev, medicine]);
    setNewMedicine({ name: "", expiryDate: "", price: "", description: "" });
    setShowAddForm(false);
    alert("Medicine added successfully");
  };

  // Handle Add to Cart click
  const handleAddToCart = (medicine) => {
    if (medicine.outOfStock) {
      alert(`${medicine.name} is currently out of stock.`);
      return;
    }
    alert(`Added ${medicine.name} to cart.`);
  };

  // Handle Details click
  const handleDetails = (medicine) => {
    alert(
      `Name: ${medicine.name}\n` +
        `Description: ${medicine.description}\n` +
        `Manufacturer: ${medicine.manufacturer}\n` +
        `Price: ${formatCurrency(medicine.price)}\n` +
        `${medicine.prescriptionRequired ? "Prescription Required" : "No Prescription Required"}\n` +
        `${medicine.stockStatus}`
    );
  };

  return (
    <div style={styles.container}>
      {/* Show ADD button only for admin and doctor */}
      {(userRole === "admin" || userRole === "doctor") && (
        <div style={styles.addButtonContainer}>
          <button style={styles.addButton} onClick={() => setShowAddForm(true)} aria-label="Add new medicine">
            + Add New Medicine
          </button>
        </div>
      )}

      {/* Medicines display grid */}
      <div style={styles.grid}>
        {medicines.map((medicine) => (
          <div key={medicine.id} style={styles.card}>
            <div>
              <div style={styles.title}>{medicine.name}</div>
              <div style={styles.description}>{medicine.description}</div>
              <div style={styles.manufacturer}>
                <strong>Manufacturer:</strong> {medicine.manufacturer}
              </div>
              <div style={styles.stockStatus}>
                {medicine.stockStatus}
                {medicine.prescriptionRequired && <span style={styles.prescriptionText}> Prescription Required</span>}
              </div>
              <div style={styles.price}>{formatCurrency(medicine.price)}</div>
            </div>

            <div style={styles.buttonsContainer}>
              <button
                style={{
                  ...styles.button,
                  ...styles.addToCartBtn,
                  ...(medicine.outOfStock ? styles.addToCartBtnDisabled : {}),
                }}
                onClick={() => handleAddToCart(medicine)}
                disabled={medicine.outOfStock}
                aria-label={`Add ${medicine.name} to cart`}
              >
                Add to Cart
              </button>
              <button style={{ ...styles.button, ...styles.detailsBtn }} onClick={() => handleDetails(medicine)} aria-label={`View details of ${medicine.name}`}>
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Medicine Modal */}
      {showAddForm && (
        <div style={styles.formOverlay} role="dialog" aria-modal="true" aria-labelledby="addMedicineTitle">
          <div style={styles.formContainer}>
            <h2 id="addMedicineTitle">Add New Medicine</h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label htmlFor="name" style={styles.label}>Medicine Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newMedicine.name}
                  onChange={handleChange}
                  style={styles.input}
                  required
                  autoFocus
                />
              </div>
              <div style={styles.formGroup}>
                <label htmlFor="expiryDate" style={styles.label}>Expiry Date</label>
                <input
                  type="date"
                  id="expiryDate"
                  name="expiryDate"
                  value={newMedicine.expiryDate}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label htmlFor="price" style={styles.label}>Price (₹)</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  min="0"
                  step="0.01"
                  value={newMedicine.price}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label htmlFor="description" style={styles.label}>Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={newMedicine.description}
                  onChange={handleChange}
                  style={styles.textarea}
                  required
                />
              </div>
              <div style={styles.formButtons}>
                <button type="button" style={{ ...styles.btnCancel, ...styles.button }} onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" style={{ ...styles.btnSave, ...styles.button }}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medicines;
