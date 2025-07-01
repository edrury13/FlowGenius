import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

console.log('🚀 React entry point loaded');

const container = document.getElementById('root');
console.log('📍 Root container:', container);

if (!container) {
  console.error('❌ Failed to find the root element');
  document.body.innerHTML = '<div style="padding: 20px; font-family: Arial; color: red;">❌ Failed to find root element</div>';
} else {
  try {
    console.log('🎨 Creating React root...');
    const root = createRoot(container);
    
    console.log('🎭 Rendering React app...');
    root.render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    
    console.log('✅ React app rendered successfully!');
  } catch (error) {
    console.error('❌ Error rendering React app:', error);
    container.innerHTML = `
      <div style="padding: 20px; background: red; color: white;">
        <h2>React Error</h2>
        <p>${error instanceof Error ? error.message : String(error)}</p>
      </div>
    `;
  }
} 