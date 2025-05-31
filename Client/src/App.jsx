import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './component/Signup'
import Login from './component/Login'
import CardRearch from './component/CardRearch'
import MassagePage from './component/MassagePage'


function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/card" element={<CardRearch />} />
        <Route path="/massagePage" element={<MassagePage />} />
      </Routes>
    </Router>
  )
}

export default App
