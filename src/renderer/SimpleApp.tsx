import React from 'react';

const SimpleApp: React.FC = () => {
  return (
    <div style={{
      padding: '40px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
    }}>
      <h1>FlowGenius</h1>
      <p>Your productivity companion is now working!</p>
      <p>✅ React is successfully loaded</p>
      <p>✅ TypeScript is working</p>
      <p>✅ Electron is running</p>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
          onClick={() => alert('FlowGenius is working!')}
        >
          Test Button
        </button>
      </div>
    </div>
  );
};

export default SimpleApp; 