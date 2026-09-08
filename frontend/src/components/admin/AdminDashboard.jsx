import { useState } from "react";

import {
  getAdminUsers,
  getAdminResources,
  getAdminReservations,
  addAdminResource,
  approveReservation,
  rejectReservation,
} from "../../services/api";

import AdminUsers from "./AdminUsers";
import AdminResources from "./AdminResources";
import AdminReservations from "./AdminReservations";

function AdminDashboard({ user, logout }) {
  const [users, setUsers] = useState([]);
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [activeSection, setActiveSection] =
    useState("overview");

  const [message, setMessage] = useState("");

  const [showAddResource, setShowAddResource] =
    useState(false);

  const [newResource, setNewResource] = useState({
    name: "",
    type: "",
    capacity: "",
    location: "",
    facilities: ""
});

  // ================================
  // LOAD USERS
  // ================================

  const loadUsers = async () => {
    try {
      const response = await getAdminUsers();

      setUsers(response.data);
      setActiveSection("users");
      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          "Could not load users"
      );
    }
  };

  // ================================
  // LOAD RESOURCES
  // ================================

  const loadResources = async () => {
    try {
      const response =
        await getAdminResources();

      setResources(response.data);
      setActiveSection("resources");
      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          "Could not load resources"
      );
    }
  };

  // ================================
  // ADD RESOURCE
  // ================================

  const handleAddResource = async () => {
    try {
      const response = await addAdminResource({
  name: newResource.name,
  type: newResource.type,
  capacity: Number(newResource.capacity),
  location: newResource.location,
  facilities: newResource.facilities,
});

      setMessage(
        response.data.message ||
          "Resource created successfully"
      );

      setNewResource({
  name: "",
  type: "",
  capacity: "",
  location: "",
  facilities: "",
});

      setShowAddResource(false);

      loadResources();
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          "Could not create resource"
      );
    }
  };

  // ================================
  // LOAD RESERVATIONS
  // ================================

  const loadReservations = async () => {
    try {
      const response =
        await getAdminReservations();

      setReservations(response.data);
      setActiveSection("reservations");
      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          "Could not load reservations"
      );
    }
  };

  // ================================
  // APPROVE RESERVATION
  // ================================

  const handleApproveReservation =
    async (id) => {
      try {
        const response =
          await approveReservation(id);

        setMessage(
          response.data.message ||
            "Reservation approved successfully"
        );

        loadReservations();
      } catch (error) {
        setMessage(
          error.response?.data?.error ||
            "Could not approve reservation"
        );
      }
    };

  // ================================
  // REJECT RESERVATION
  // ================================

  const handleRejectReservation =
    async (id) => {
      try {
        const response =
          await rejectReservation(id);

        setMessage(
          response.data.message ||
            "Reservation rejected successfully"
        );

        loadReservations();
      } catch (error) {
        setMessage(
          error.response?.data?.error ||
            "Could not reject reservation"
        );
      }
    };

  return (
    <div className="admin-dashboard">

      {/* NAVBAR */}

      <nav className="navbar">

        <div>
          <h2>
            🏫 CampusReserve Admin
          </h2>

          <span>
            Welcome, {user?.name}
          </span>
        </div>

        <button onClick={logout}>
          Logout
        </button>

      </nav>

      <div className="admin-layout">

        {/* SIDEBAR */}

        <aside className="sidebar">

          <button
            onClick={() =>
              setActiveSection("overview")
            }
          >
            📊 Overview
          </button>

          <button onClick={loadUsers}>
            👥 Users
          </button>

          <button onClick={loadResources}>
            🏫 Resources
          </button>

          <button onClick={loadReservations}>
            📋 Reservations
          </button>

        </aside>

        {/* MAIN CONTENT */}

        <main className="admin-content">

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          {/* OVERVIEW */}

          {activeSection === "overview" && (
            <div>

              <h1>
                Admin Dashboard
              </h1>

              <p className="subtitle">
                Manage your cloud reservation
                system.
              </p>

              <div className="admin-stats">

                <div className="stat-card">
                  <h3>👥 Users</h3>
                  <p>{users.length}</p>
                </div>

                <div className="stat-card">
                  <h3>🏫 Resources</h3>
                  <p>{resources.length}</p>
                </div>

                <div className="stat-card">
                  <h3>📋 Reservations</h3>
                  <p>{reservations.length}</p>
                </div>

              </div>

            </div>
          )}

          {/* USERS */}

          {activeSection === "users" && (
  <AdminUsers users={users} />
)}

          {/* RESOURCES */}

          {activeSection === "resources" && (
  <AdminResources
    resources={resources}
    showAddResource={showAddResource}
    setShowAddResource={setShowAddResource}
    newResource={newResource}
    setNewResource={setNewResource}
    handleAddResource={handleAddResource}
  />
)}

          {/* RESERVATIONS */}

          {activeSection === "reservations" && (
  <AdminReservations
    reservations={reservations}
    handleApproveReservation={
      handleApproveReservation
    }
    handleRejectReservation={
      handleRejectReservation
    }
  />
)}

        </main>

      </div>

    </div>
  );
}

export default AdminDashboard;