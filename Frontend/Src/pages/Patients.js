import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { patientsAPI } from '../utils/api';
import { formatDate } from '../utils/api';

const Patients = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await patientsAPI.getPatients({ search: searchTerm });
      setPatients(response.data.patients);
    } catch (error) {
      console.error('Error fetching patients:', error);
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
          <i className="fas fa-user-injured me-2"></i>
          Patients Management
        </h2>
        {user.role === 'admin' && (
          <button className="btn btn-primary">
            <i className="fas fa-plus me-2"></i>
            Add New Patient
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row align-items-center">
            <div className="col">
              <h5 className="mb-0">Patient List</h5>
            </div>
            <div className="col-auto">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="btn btn-outline-primary" onClick={fetchPatients}>
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="card-body">
          {patients.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Blood Group</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient._id}>
                      <td className="fw-semibold">{patient.patientId}</td>
                      <td>
                        {patient.user?.firstName} {patient.user?.lastName}
                      </td>
                      <td>{patient.user?.email}</td>
                      <td>{patient.user?.phone}</td>
                      <td>
                        {patient.bloodGroup ? (
                          <span className="badge bg-primary">{patient.bloodGroup}</span>
                        ) : (
                          <span className="text-muted">Not specified</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary me-2">
                          <i className="fas fa-eye"></i>
                        </button>
                        {(user.role === 'admin' || user.role === 'doctor') && (
                          <button className="btn btn-sm btn-outline-secondary">
                            <i className="fas fa-edit"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="fas fa-users fa-3x text-muted mb-3"></i>
              <p className="text-muted">No patients found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Patients;
