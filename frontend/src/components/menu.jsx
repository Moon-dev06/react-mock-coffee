import React, { useState } from 'react';
import { productList } from '../data/productList';
import CustomizeModal from './custom'; // นำเข้า Modal
import '../style/menu.css';
// import img from '../../public/assets/image/americano.jpg'; // ตัวอย่างการนำเข้ารูปภาพ

const MenuScreen = ({ onShowSlip }) => {
  // 1. สถานะสำหรับเลือกหมวดหมู่
  const [activeTab, setActiveTab] = useState('ทั้งหมด');
  const [selectedItem, setSelectedItem] = useState(null); // สถานะสำหรับเก็บสินค้าที่เลือกเพื่อปรับแต่ง
  const categories = ['ทั้งหมด', 'สินค้าแนะนำ', 'กาแฟ', 'ชา', 'อื่นๆ'];

  const menuItems = productList; 

  // 2. ฟังก์ชันกรองสินค้า
  const filteredItems = activeTab === 'ทั้งหมด' || activeTab === 'สินค้าแนะนำ'
    ? menuItems
    : menuItems.filter(item => {
        const categoryMap = {
          'กาแฟ': 'coffee',
          'ชา': 'tea',
          'อื่นๆ': 'other'
        };
        return item.category === categoryMap[activeTab];
      });

  return (
    <div className="menu-container">
      {/* AppBar Section */}
      <header>
        <div className="app-bar">
          Mock Coffee Machine
        </div>
        
        <div className="tab-bar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={activeTab === cat ? 'active' : ''}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main>
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">☕</div>
            ไม่มีสินค้าในหมวดหมู่นี้
          </div>
        ) : (
          <div className="product-grid">
            {filteredItems.map((item, index) => (
              <ProductCard 
                key={index} 
                item={item} 
                onSelect={() => setSelectedItem(item)} // เมื่อคลิกให้เซตไอเทมที่เลือก
              />
            ))}
          </div>
        )}
      </main>

      {/* แสดง Modal เมื่อมีการเลือกสินค้า */}
      {selectedItem && (
        <CustomizeModal 
          item={selectedItem} 
          onClose={(receiptData) => {
            setSelectedItem(null);
            if (receiptData) {
              onShowSlip?.(receiptData); // ถ้ามีข้อมูลสลิปส่งมา ให้เรียกฟังก์ชันแสดงสลิป
            }
          }}
        />
      )}
    </div>
  );
};

// 3. Sub-component สำหรับ Card สินค้า
const ProductCard = ({ item, onSelect }) => {
  return (
    <div 
      className="product-card"
      onClick={onSelect}
    >
      {/* ส่วนรูปภาพ */}
      <div className="card-image">
        <img 
          src={`${process.env.REACT_APP_ASSETS_URL}/coffeemachine/assets/image/${item.nameimage}.jpg`}
          alt={item.productName}
          onError={(e) => {
            e.target.style.display = 'none'; // ซ่อนรูปถ้าโหลดไม่ได้
            console.log('รูปโหลดไม่ได้:', e.target.src)
            const fallback = e.target.nextElementSibling;
            if (fallback) fallback.style.display = 'block'; // แสดง icon แทน
          }}
        />
        {/* Icon สำรองเมื่อโหลดรูปไม่ได้ */}
        <div className="fallback-icon" style={{ display: 'none' }}>☕</div>
      </div>

      {/* ส่วนข้อมูล */}
      <div className="card-info">
        <h3 className="card-name">
          {item.productName}
        </h3>
        <div className="card-footer">
          <span className="card-price">
            {item.unitprice} ฿
          </span>
          <button className="btn-add">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuScreen;