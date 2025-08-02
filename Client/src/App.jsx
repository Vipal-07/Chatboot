import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './component/Signup'
import Login from './component/Login'
import CardRearch from './component/CardRearch'
import MassagePage from './component/MassagePage'
import ProtectedRoute from './component/ProtectedRoute';
import toast, { Toaster } from 'react-hot-toast';
import WeatherApp from './component/WeatherApp';


function App() {

  return (
    <>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
           <Route path="/weather" element={<WeatherApp />} />

          <Route
            path="/card"
            element={
              
                <CardRearch />
              
            }
          />
          <Route
            path="/card/:userId"
            element={
              
                <MassagePage />
      
            }
          />
          <Route path="*" element={<WeatherApp />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
