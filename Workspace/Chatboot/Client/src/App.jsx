// filepath: /home/vikas07/Public/Chatboot/Client/src/App.jsx
import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './component/Signup'
import Login from './component/Login'
import CardRearch from './component/CardRearch'
import MassagePage from './component/MassagePage'
import ProtectedRoute from './component/ProtectedRoute';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/card"
            element={
              <ProtectedRoute>
                <CardRearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/card/:userId"
            element={
              <ProtectedRoute>
                <MassagePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Login />} />
        </Routes>
      </Router>
    </>
  )
}

export default App