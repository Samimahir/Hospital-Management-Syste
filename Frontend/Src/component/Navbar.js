import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/patients':
        return 'Patients';
      case '/doctors':
        return 'Doctors';
      case '/appointments':
        return 'Appointments';
      case '/medicines':
        return 'Medicines';
      case '/profile':
        return 'Profile';
      default:
        return 'Hospital Management System';
    }
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const breadcrumbs = [
      { name: 'Home', path: '/dashboard', active: false }
    ];

    if (path !== '/dashboard') {
      breadcrumbs.push({
        name: getPageTitle(),
        path: path,
        active: true
      });
    } else {
      breadcrumbs[0].active = true;
    }

    return breadcrumbs;
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <nav className="top-header d-flex justify-content-between align-items-center">
      <div>
        <h4 className="mb-1 text-gradient">{getPageTitle()}</h4>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            {getBreadcrumbs().map((crumb, index) => (
              <li
                key={index}
                className={`breadcrumb-item ${crumb.active ? 'active' : ''}`}
                aria-current={crumb.active ? 'page' : undefined}
              >
                {crumb.active ? (
                  crumb.name
                ) : (
                  <a href={crumb.path} className="text-decoration-none">
                    {crumb.name}
                  </a>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="d-flex align-items-center">
        {/* User Info */}
        <div className="dropdown">
          <button
            className="btn btn-link text-decoration-none dropdown-toggle d-flex align-items-center"
            type="button"
            id="userDropdown"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <div className="avatar me-2">
              <div
                className="bg-primary rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '40px', height: '40px' }}
              >
                <i className="fas fa-user text-white"></i>
              </div>
            </div>
            <div className="text-start">
              <div className="fw-semibold text-dark">
                {user?.firstName} {user?.lastName}
              </div>
              <small className="text-muted text-capitalize">
                {user?.role}
              </small>
            </div>
          </button>

          <ul className="dropdown-menu dropdown-menu-end shadow" aria-labelledby="userDropdown">
            <li>
              <a className="dropdown-item" href="/profile">
                <i className="fas fa-user-circle me-2"></i>
                Profile
              </a>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <button
                className="dropdown-item text-danger"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                Logout
              </button>
            </li>
          </ul>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="btn btn-link d-md-none ms-2"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#mobileSidebar"
          aria-controls="mobileSidebar"
        >
          <i className="fas fa-bars"></i>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
