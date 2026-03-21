import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LoginPage from "./pages/LoginPage";
import TreesPage from "./pages/TreesPage";
import TreeViewPage from "./pages/TreeViewPage";

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/trees" element={<ProtectedRoute><TreesPage /></ProtectedRoute>} />
          <Route path="/trees/:treeId" element={<ProtectedRoute><TreeViewPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/trees" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
