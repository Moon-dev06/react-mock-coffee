import React, { useState, useEffect, useRef } from "react";
import "../style/custom.css";
import StatusDialog from "./statuslog";
import { apiService } from "../service/api-service";
import dayjs from "dayjs";

const MODAL_STATUS = {
  CUSTOMIZATION: "customization",
  PROCESSING: "processing",
  QR: "qr",
};

const SIZE_OPTIONS = [
  { value: "M", label: "M" },
  { value: "L", label: "L  +15฿" },
];
const SUGAR_OPTIONS = ["ไม่มีน้ำตาล", "น้อย", "ปกติ", "หวาน"];
const MILK_OPTIONS = ["ไม่มีนม", "นมโอ๊ต (+10฿)", "นมสด"];
const ICE_OPTIONS = ["ไม่มีน้ำแข็ง", "น้อย", "ปกติ"];

function calcTotal(item, size, extraShot, milk) {
  const base = Number(item?.unitprice ?? 0);
  return (
    base +
    (size === "L" ? 15 : 0) +
    (extraShot ? 15 : 0) +
    (milk === "นมโอ๊ต (+10฿)" ? 10 : 0)
  );
}

function Dropdown({ label, value, options, onChange }) {
  return (
    <div className="custom-dropdown-row">
      <span className="custom-dropdown-label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="custom-select"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function TerminalLog({ logs }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="custom-terminal-wrapper">
      <span className="custom-terminal-title">&gt;_ System Status</span>
      <div className="custom-terminal">
        {logs.map((line, i) => (
          <div key={i} className="custom-terminal-line">
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function QRPlaceholder({ qrData, totalPrice }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData || "mock-qr-data")}`;
  return (
    <div className="custom-qr-container">
      <img src={qrUrl} alt="QR Code" className="custom-qr-image" />
      <p className="custom-qr-price">{totalPrice} ฿</p>
    </div>
  );
}

export default function CustomizeModal({ item, onClose }) {
  const [size, setSize] = useState("M");
  const [sugar, setSugar] = useState("ปกติ");
  const [milk, setMilk] = useState("ไม่มีนม");
  const [ice, setIce] = useState("ปกติ");
  const [extraShot, setExtraShot] = useState(false);
  const [status, setStatus] = useState(MODAL_STATUS.CUSTOMIZATION);
  const [logs, setLogs] = useState([]);
  const [qrData, setQrData] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);

  const [accessToken, setAccessToken] = useState(null);
  const [inquiryPayload, setInquiryPayload] = useState(null);

  const totalPrice = calcTotal(item, size, extraShot, milk);
  const isCoffee = item?.category === "coffee";

  function addLog(msg) {
    const time = new Date().toTimeString().slice(0, 8);
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  }

  async function handleProceed() {
    setStatus(MODAL_STATUS.PROCESSING);
    setLogs([]);
    try {
      addLog("🔑 Getting Token...");
      const token = await apiService.getToken();
      console.log("Token from API Service:", token);

      if (!token) throw new Error("Could not get access token");

      setAccessToken(token);
      addLog("✅ Token OK");
      await delay(500);

      addLog("📡 Inquiry...");
      const inquiryRes = await apiService.inquiryPayment(totalPrice, token);

      if (inquiryRes && inquiryRes.data?.result?.payload) {
        const payload = inquiryRes.data.result.payload;
        setInquiryPayload(payload);
        setQrData(payload.ref1 ?? "");

        setStatus(MODAL_STATUS.QR);
        addLog("✅ Inquiry OK");
        addLog("QR Code Generated. Waiting for scan...");
      } else {
        throw new Error("Inquiry failed");
      }
    } catch (e) {
      console.error(e);
      addLog(`❌ ERROR: ${e.message}`);
      // แสดง error แปปนึงแล้วกลับหน้าเดิม
      await delay(2000);
      setStatus(MODAL_STATUS.CUSTOMIZATION);
    }
  }

  async function handleConfirmPayment() {
    setStatus(MODAL_STATUS.PROCESSING);
    try {
      const channel = process.env.REACT_APP_CHANNEL;
      const transId = dayjs().format("YYYYMMDDHHmmssSSS") + channel;
      const formattedDate = dayjs().format("YYYY-MM-DD HH:mm:ss.SSS");

      addLog("💳 Payment...");
      console.log("transID : ", transId);
      console.log("formattedDate : ", formattedDate);

      const payRes = await apiService.processPayment({
        item: item,
        totalPrice: totalPrice,
        transId: transId,
        formattedDate: formattedDate,
        storedInquiryPayload: inquiryPayload,
        storedToken: accessToken,
      });

      if (!payRes) throw new Error("Payment failed");
      addLog("✅ Payment OK");

      addLog("⏳ Waiting for transaction to process (5s)...");
      await delay(5000);

      addLog("🔍 Checking Final Status...");
      const checkRes = await apiService.checkPaymentStatus({
        transId: transId,
        channel: process.env.REACT_APP_CHANNEL,
        storedToken: accessToken,
      });

      const actualStatus = checkRes?.data?.result?.payload?.payment_process_status;
      console.log("Actual Status from API:", actualStatus);

      if (checkRes && (actualStatus === "1" || actualStatus === 1)) {
        addLog("✅ Payment Confirmed!");
        await delay(1000);
        onClose?.(checkRes.data.result.payload);
        return;
      } else {
        addLog(`⚠️ Status is: ${actualStatus || "unknown"}`);
        throw new Error("Payment not confirmed. Please try again.");
      }
    } catch (e) {
      console.error(e);
      addLog(`❌ ERROR: ${e.message}`);
      setPaymentResult("error");
    }
  }

  function handleBackToEdit() {
    setStatus(MODAL_STATUS.CUSTOMIZATION);
    setLogs([]);
  }

  const getReceiptData = () => {
    const lines = [
      `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      `Item: ${item?.productName}`,
      `Size: ${size}`,
      `Sugar: ${sugar}`,
      `Milk: ${milk}`,
      `Ice: ${ice}`,
    ];
    if (extraShot) lines.push(`Extra Shot: Yes (+15฿)`);
    lines.push(`---------------------------`);
    lines.push(`TOTAL: ${totalPrice} ฿`);
    lines.push(`Ref: ${qrData || "N/A"}`);
    return lines;
  };

  if (paymentResult) {
    return (
      <StatusDialog
        isSuccess={paymentResult === "success"}
        onDone={() => {
          if (paymentResult === "success") {
            onClose?.(getReceiptData());
          } else {
            setPaymentResult(null);
            onClose?.();
          }
        }}
        onRetry={() => {
          setPaymentResult(null);
          setStatus(MODAL_STATUS.QR);
        }}
      />
    );
  }

  return (
    <div
      className="custom-overlay"
      onClick={(e) =>
        e.target === e.currentTarget &&
        status === MODAL_STATUS.CUSTOMIZATION &&
        onClose?.()
      }
    >
      <div className="custom-dialog">
        <h2 className="custom-title">Customize {item?.productName}</h2>

        {status === MODAL_STATUS.CUSTOMIZATION && (
          <div className="custom-form-section">
            <p className="custom-section-label">ขนาด</p>
            <div className="custom-segmented-group">
              {SIZE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  className={`custom-segment-btn ${size === value ? "active" : ""}`}
                  onClick={() => setSize(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <hr className="custom-divider" />
            <Dropdown
              label="ปริมาณน้ำตาล"
              value={sugar}
              options={SUGAR_OPTIONS}
              onChange={setSugar}
            />
            <Dropdown
              label="นม"
              value={milk}
              options={MILK_OPTIONS}
              onChange={setMilk}
            />
            <Dropdown
              label="น้ำแข็ง"
              value={ice}
              options={ICE_OPTIONS}
              onChange={setIce}
            />
            {isCoffee && (
              <label className="custom-checkbox-row">
                <input
                  type="checkbox"
                  checked={extraShot}
                  onChange={(e) => setExtraShot(e.target.checked)}
                  className="custom-checkbox"
                />
                <span className="custom-checkbox-label">
                  เพิ่มช็อตกาแฟ (+15฿)
                </span>
              </label>
            )}
          </div>
        )}

        {status !== MODAL_STATUS.CUSTOMIZATION && <TerminalLog logs={logs} />}
        {status === MODAL_STATUS.QR && (
          <QRPlaceholder qrData={qrData} totalPrice={totalPrice} />
        )}

        {status === MODAL_STATUS.PROCESSING && (
          <div className="custom-spinner-section">
            <div className="custom-spinner" />
            <p className="custom-processing-text">Processing Transaction...</p>
          </div>
        )}

        <div className="custom-actions">
          {status === MODAL_STATUS.CUSTOMIZATION && (
            <div className="custom-action-row">
              <div className="custom-price-tag">{totalPrice} ฿</div>
              <div className="custom-btn-group">
                <button
                  className="custom-btn-outline"
                  onClick={() => onClose()}
                >
                  ยกเลิก
                </button>
                <button className="custom-btn-primary" onClick={handleProceed}>
                  ต่อไป →
                </button>
              </div>
            </div>
          )}
          {status === MODAL_STATUS.QR && (
            <>
              <button
                className="custom-btn-primary"
                style={{ width: "100%" }}
                onClick={handleConfirmPayment}
              >
                ยืนยันการชำระเงิน
              </button>
              <button className="custom-btn-text" onClick={handleBackToEdit}>
                กลับไปแก้ไข
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));