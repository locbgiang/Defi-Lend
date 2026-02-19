import { useState } from 'react'
import Header from './components/Header';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <Header />
        hello world
      </div>
    </>
  )
}

export default App
