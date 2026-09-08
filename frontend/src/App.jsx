import { useState } from "react";
import "./App.css";

import Login from "./components/Login";
import UserDashboard from "./components/user/UserDashboard";
import AdminDashboard from "./components/admin/AdminDashboard";

function App() {
  const [user, setUser] = useState(null);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  if (!user) {
    return <Login setUser={setUser} />;
  }

  if (user.role === "admin") {
    return (
      <AdminDashboard
        user={user}
        logout={logout}
      />
    );
  }

  return (
    <UserDashboard
      user={user}
      logout={logout}
    />
  );
}

export default App;