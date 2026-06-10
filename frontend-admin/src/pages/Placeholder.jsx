import React from 'react';
import { useLocation } from 'react-router-dom';

const Placeholder = ({ title }) => {
  const location = useLocation();
  const pageTitle = title || location.pathname.replace('/', '').replace(/-/g, ' ');

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0 text-capitalize">{pageTitle}</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="fas fa-hard-hat fa-3x text-warning mb-3"></i>
              <h4>Đang phát triển</h4>
              <p className="text-muted">Module này sẽ sớm được hoàn thiện.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Placeholder;
