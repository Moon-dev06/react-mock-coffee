import React from 'react';
import '../style/statuslog.css';

export default function StatusDialog({ isSuccess, errorMessage, onDone, onRetry }) {
  return (
    <div className="status-overlay">
      <div className="status-dialog">

        <div className={`status-header ${isSuccess ? 'success' : 'error'}`}>
          <div className="status-icon-circle">
            {isSuccess ? <CheckIcon /> : <CloseIcon />}
          </div>
        </div>

        <div className="status-content">
          <p className={`status-text ${isSuccess ? 'success' : 'error'}`}>
            {isSuccess ? 'ชำระเงินสำเร็จ' : 'ชำระเงินไม่สำเร็จ'}
          </p>
          <p className="status-subtext">
            {isSuccess
              ? 'ทำรายการเสร็จสิ้น'
              : (errorMessage ?? 'ไม่สามารถชำระได้ กรุณาลองใหม่อีกครั้ง')}
          </p>
        </div>

        <div className="status-button-section">
          {isSuccess ? (
            <button className="status-btn-outline" onClick={onDone}>
              เสร็จสิ้น
            </button>
          ) : (
            <button className="status-btn-outline-gray" onClick={onRetry}>
              ลองสแกนใหม่อีกครั้ง
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="status-icon-svg">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="status-icon-svg">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}