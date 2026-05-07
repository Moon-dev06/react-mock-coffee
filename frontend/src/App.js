import { useState } from 'react'
import './App.css'
import MenuScreen from './components/menu';
import PaymentSlipPage from './components/slip_page';

function App() {
  const [view, setView] = useState('menu'); // 'menu' | 'slip'
  const [slipData, setSlipData] = useState([]);

  const handleShowSlip = (data) => {
    setSlipData(data);
    setView('slip');
  };

  const handleBackToMenu = () => {
    setSlipData([]);
    setView('menu');
  };

  return (
    <div className="app-container">
      {view === 'menu' ? (
        <MenuScreen onShowSlip={handleShowSlip} />
      ) : (
        <PaymentSlipPage 
          receiptLines={slipData} 
          onDone={handleBackToMenu} 
        />
      )}
    </div>
  )
}

export default App
