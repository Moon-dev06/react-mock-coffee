import React from 'react';
import '../style/slip_page.css';

export default function PaymentSlipPage({ receiptLines: payload, onDone }) {
  const lines = payload?.slip?.[0]?.receiptLines || [];

  return (
    <div className="slip-page">
      <header className="slip-app-bar">
        <button className="slip-back-btn" onClick={onDone}>
          <ChevronLeft />
        </button>
        <span className="slip-app-bar-title">Payment Slip</span>
        <div className="slip-spacer" />
      </header>
      
      <div className="slip-body">
        <div className="slip-card">
          <div className="slip-icon-wrapper">
            <CheckCircleIcon />
          </div>
          <p className="slip-success-text">ชำระเงินสำเร็จ</p>
          
          <div className="slip-receipt-paper">
            {lines.length > 0 ? (
              lines.map((line, i) => (
                <div key={i} className="slip-receipt-line">
                  {line}
                </div>
              ))
            ) : (
              <p className="slip-empty-text">ไม่มีข้อมูลใบเสร็จ</p>
            )}
          </div>
          
          <div className="slip-paper-bottom-edge"></div>
        </div>

        <button className="slip-done-btn" onClick={onDone}>
          กลับสู่หน้าหลัก
        </button>
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#4caf50" className="slip-icon-svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10
               10-4.48 10-10S17.52 2 12 2zm-2
               14.59L5.41 12 6.83 10.59l3.17
               3.17 6.36-6.36 1.41 1.41L10 16.59z"/>
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="slip-chevron-svg">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
