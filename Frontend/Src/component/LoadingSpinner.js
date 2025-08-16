import React from 'react';

const LoadingSpinner = ({ size = 'lg', text = 'Loading...' }) => {
  return (
    <div className="loading-overlay">
      <div className="text-center">
        <div className={`spinner-border text-primary spinner-border-${size}`} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        {text && (
          <div className="mt-3">
            <p className="text-muted">{text}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
