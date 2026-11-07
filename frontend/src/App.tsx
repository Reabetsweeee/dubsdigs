import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { session } from './api';
import { Landing, Login, Shell, Home, Requests, Staff } from './pages';
import Discover from './Discover';

const Protected = ({ children }: { children: JSX.Element }) => (session.get() ? children : <Navigate to="/login" />);
const Only = ({ role, children }: { role: string; children: JSX.Element }) => (session.get()?.role === role ? children : <Navigate to="/app" />);

const Index = () => (session.get()?.role === 'student' ? <Home /> : <Staff />);

export default function App() {
  return (
    <BrowserRouter><Routes>
      <Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} />
      <Route path="/app" element={<Protected><Shell /></Protected>}>
        <Route index element={<Index />} />
        <Route path="discover" element={<Only role="student"><Discover /></Only>} />
        <Route path="requests" element={<Only role="student"><Requests /></Only>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes></BrowserRouter>
  );
}
