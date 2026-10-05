import { useState } from "react";

import {
  getResources,
  createReservation,
  getMyReservations,
  cancelReservation,
  getNotifications,
} from "../../services/api";

import ResourceList from "./ResourceList";
import ReservationForm from "./ReservationForm";
import MyReservations from "./MyReservations";
import Notifications from "./Notifications";

function UserDashboard({ user, logout }) {
  const [resources, setResources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [showResources, setShowResources] =
    useState(false);

  const [showReservations, setShowReservations] =
    useState(false);

  const [showReservationForm, setShowReservationForm] =
    useState(false);

  const [showNotifications, setShowNotifications] = 
    useState(false);

  const [resourceId, setResourceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const viewResources = async () => {
  try {
    setLoading(true);

    const response = await getResources();

    setResources(response.data);

    setShowResources(true);
    setShowReservations(false);
    setShowReservationForm(false);
    setMessage("");

  } catch (error) {
    setMessage(
      error.response?.data?.error ||
        "Could not load resources"
    );
  } finally {
    setLoading(false);
  }
};

  const openReservationForm = async () => {
    try {
      const response = await getResources();

      setResources(response.data);

      setShowReservationForm(true);
      setShowResources(false);
      setShowReservations(false);
      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          "Could not load resources"
      );
    }
  };

  const makeReservation = async () => {
  if (!resourceId || !startTime || !endTime) {
    setMessage("Please fill all reservation fields.");
    return;
  }

  if (new Date(startTime) >= new Date(endTime)) {
    setMessage("End time must be after start time.");
    return;
  }

  try {
    const response = await createReservation(
      resourceId,
      startTime,
      endTime
    );

    // Clear form
    setResourceId("");
    setStartTime("");
    setEndTime("");

    // Close reservation form
    setShowReservationForm(false);

    // Load updated reservations
    await viewReservations();

    // Show success message
    setMessage(
      response.data.message ||
        "Reservation created successfully!"
    );

  } catch (error) {
    setMessage(
      error.response?.data?.error ||
        "Could not create reservation"
    );
  }
};


const viewReservations = async () => {
  try {
    setLoading(true);

    const response = await getMyReservations();

    setReservations(response.data);

    setShowReservations(true);
    setShowResources(false);
    setShowReservationForm(false);

    setMessage("");

  } catch (error) {
    setMessage(
      error.response?.data?.error ||
        "Could not load reservations"
    );
  } finally {
    setLoading(false);
  }
};

const viewNotifications = async () => {
  try {
    setLoading(true);

    const response = await getNotifications();

    setNotifications(response.data);

    setShowNotifications(true);
    setShowResources(false);
    setShowReservations(false);
    setShowReservationForm(false);

    setMessage("");

  } catch (error) {
    setMessage(
      error.response?.data?.error ||
        "Could not load notifications"
    );
  } finally {
    setLoading(false);
  }
};

  const handleCancelReservation = async (
    reservationId
  ) => {
    try {
      const response =
        await cancelReservation(reservationId);

      setMessage(
        response.data.message ||
          "Reservation cancelled successfully"
      );

      const updated =
        await getMyReservations();

      setReservations(updated.data);
    } catch (error) {
      setMessage(
        error.response?.data?.error ||
          "Could not cancel reservation"
      );
    }
  };

  return (
    <div className="dashboard">

      <nav className="navbar">

        <div>
          <h2>🏫 CampusReserve</h2>

          <span>
            College Resource Reservation System
          </span>
        </div>

        <button onClick={logout}>
          Logout
        </button>

      </nav>

      <div className="dashboard-content">

        <h1>
          Welcome, {user?.name} 👋
        </h1>

        <p className="subtitle">
          Manage your college resources and
          reservations.
        </p>

        <div className="cards">

          <div className="card">

  <h3>🔔 Notifications</h3>

  <p>
    View updates about your reservations.
  </p>

  <button
    onClick={viewNotifications}
    disabled={loading}
  >
    {loading
      ? "Loading..."
      : "View Notifications"}
  </button>

</div>

          <div className="card">

            <h3>🏫 College Resources</h3>

            <p>
              View available college resources.
            </p>

            <button
  onClick={viewResources}
  disabled={loading}
>
  {loading ? "Loading..." : "View Resources"}
</button>

          </div>

          <div className="card">

            <h3>📅 Make Reservation</h3>

            <p>
              Reserve a college resource.
            </p>

            <button
              onClick={openReservationForm}
            >
              Reserve Resource
            </button>

          </div>

          <div className="card">

            <h3>📋 My Reservations</h3>

            <p>
              View your current reservations.
            </p>

            <button
  onClick={viewReservations}
  disabled={loading}
>
  {loading
    ? "Loading..."
    : "View Reservations"}
</button>

          </div>

        </div>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {showResources && (
          <ResourceList
            resources={resources}
          />
        )}

        {showReservationForm && (
          <ReservationForm
            resources={resources}
            resourceId={resourceId}
            setResourceId={setResourceId}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            makeReservation={makeReservation}
          />
        )}

        {showReservations && (
          <MyReservations
            reservations={reservations}
            cancelReservation={
              handleCancelReservation
            }
          />
        )}

        {showNotifications && (
  <Notifications
    notifications={notifications}
  />
)}

        <div className="profile-card">

          <h2>👤 My Profile</h2>

          <p>
            <strong>Name:</strong>{" "}
            {user?.name}
          </p>

          <p>
            <strong>Email:</strong>{" "}
            {user?.email}
          </p>

          <p>
            <strong>Role:</strong>{" "}
            {user?.role}
          </p>

        </div>

      </div>

    </div>
  );
}

export default UserDashboard;