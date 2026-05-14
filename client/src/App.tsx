import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import { ToastProvider } from './context/ToastContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Markets from './components/Markets';
import Supply from './components/Supply';
import Borrow from './components/Borrow';
import Liquidation from './components/Liquidation';
import ToastContainer from './components/ToastContainer';
import './styles/App.css';

// Create a react-query client
const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <div className="app">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path='/' element={<Dashboard />} />
                  <Route path='/dashboard' element={<Dashboard />} />
                  <Route path='/markets' element={<Markets />} />
                  <Route path='/supply' element={<Supply />} />
                  <Route path='/borrow' element={<Borrow />} />
                  <Route path='/liquidation' element={<Liquidation />} />
                </Routes>
              </main>
            </div>
            <ToastContainer />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
