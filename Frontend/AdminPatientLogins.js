import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // For admin auth & token

const AdminPatientLogins = () => {
  const { user, token } = useAuth(); // Assuming you get token for API
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only admin can access
    if (!user || user.role !== 'admin') return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/patient-logins', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs);
        } else {
          console.error('Failed to fetch patient login logs');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [user, token]);

  if (loading) return <div>Loading patient login data...</div>;

  return (
    <div>
      <h2>Patient Login Records</h2>
      <table>
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Email</th>
            <th>Login Time</th>
            <th>IP Address</th>
            <th>User Agent</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id}>
              <td>{log.userId?.name || 'Unknown'}</td>
              <td>{log.userId?.email || 'Unknown'}</td>
              <td>{new Date(log.loginTime).toLocaleString()}</td>
              <td>{log.ipAddress}</td>
              <td>{log.userAgent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPatientLogins;
