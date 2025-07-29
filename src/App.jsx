import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import UserList from './components/UserList';
import ProtectedRoute from './components/ProtectedRoute';
import BehaviorPoint from './pages/BehaviorPoint/BehaviorPoint.jsx';
import DeductPoint from './pages/DeductPoint/DeductPoint'; 
import EditProfile from './pages/EditProfile';
import ViewProfile from './pages/ViewPofile.jsx';
import GunBorrowing from './pages/GunBorrowing.jsx';
import Navbar from './components/Navbar';
import Summary from './pages/Summary.jsx';


function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/register';

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute>
            <UserList />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/behavior-point" element={<BehaviorPoint />} />
        <Route path="/DeductPoint" element={
          <ProtectedRoute>
            <DeductPoint />
          </ProtectedRoute>
        } />
        <Route path="/edit-profile" element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        } /> 
        <Route path="/view-profile" element={
          <ProtectedRoute>
            <ViewProfile />
          </ProtectedRoute>
        } />
        <Route path="/gun-borrowing" element={
          <ProtectedRoute>
            <GunBorrowing />
          </ProtectedRoute>
        } />
        <Route path="/summary" element={
          <ProtectedRoute>
            <Summary />
          </ProtectedRoute>
        } />
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    </>
  );
}

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;