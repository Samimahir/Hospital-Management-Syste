import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doctorsAPI } from '../utils/api';
import { formatCurrency } from '../utils/api';

const Doctors = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialization, setSpecialization] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (specialization) params.specialization = specialization;

      const response = await doctorsAPI.getDoctors(params);
      setDoctors(response.data.doctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-user-md me-2"></i>
          Doctors Directory
        </h2>
        {user.role === 'admin' && (
          <button className="btn btn-primary">
            <i className="fas fa-plus me-2"></i>
            Add New Doctor
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row align-items-center">
            <div className="col">
              <h5 className="mb-0">Available Doctors</h5>
            </div>
            <div className="col-auto">
              <div className="row g-2">
                <div className="col-auto">
                  <select
                    className="form-select"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  >
                    <option value="">All Specializations</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>
                </div>
                <div className="col-auto">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search doctors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button className="btn btn-outline-primary" onClick={fetchDoctors}>
                      <i className="fas fa-search"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {doctors.length > 0 ? (
            <div className="row">
              {doctors.map((doctor) => (
                <div key={doctor._id} className="col-md-6 col-lg-4 mb-4">
                  <div className="card h-100">
                    <div className="card-body">
                      <div className="text-center mb-3">
                        <div className="avatar bg-primary rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                          <i className="fas fa-user-md fa-2x text-white"></i>
                        </div>
                        <h5 className="card-title mb-1">
                          Dr. {doctor.user?.firstName} {doctor.user?.lastName}
                        </h5>
                        <p className="text-muted small">{doctor.specialization}</p>
                      </div>

                      <div className="mb-3">
                        <div className="row text-center">
                          <div className="col">
                            <div className="fw-semibold">{doctor.experience}</div>
                            <small className="text-muted">Years Exp.</small>
                          </div>
                          <div className="col">
                            <div className="fw-semibold">{formatCurrency(doctor.consultationFee)}</div>
                            <small className="text-muted">Consultation</small>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="small text-muted mb-1">
                          <i className="fas fa-building me-2"></i>
                          {doctor.department}
                        </p>
                        <p className="small text-muted mb-1">
                          <i className="fas fa-door-open me-2"></i>
                          Room: {doctor.room}
                        </p>
                        <div className="d-flex align-items-center">
                          <i className="fas fa-circle text-success me-2" style={{ fontSize: '8px' }}></i>
                          <small className="text-success">Available</small>
                        </div>
                      </div>

                      <div className="d-grid">
                        {user.role === 'patient' ? (
                          <button className="btn btn-primary btn-sm">
                            <i className="fas fa-calendar-plus me-2"></i>
                            Book Appointment
                          </button>
                        ) : (
                          <button className="btn btn-outline-primary btn-sm">
                            <i className="fas fa-eye me-2"></i>
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="fas fa-user-md fa-3x text-muted mb-3"></i>
              <p className="text-muted">No doctors found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Doctors;
