import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Markets from './components/Markets';
import Supply from './components/Supply';
import Borrow from './components/Borrow';

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter>
      <div>
        <Header />
        hello world
        <Routes>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/markets' element={<Markets />} />
          <Route path='/supply' element={<Supply />} />
          <Route path='/borrow' element={<Borrow />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
