import { useState, useEffect } from "react";

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

  const [showResources, setShowResources] = useState(false);
  const [showReservations, setShowReservations] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [resourceId, setResourceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getNotifications();
      setNotifications(response.data || []);
    } catch (error) {
      if (!silent) {
        setMessage(
          error.response?.data?.error || "Could not load notifications"
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch of notifications
    fetchNotifications(true);

    // Poll every 8 seconds so user receives real-time badges as soon as admin acts
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const viewResources = async () => {
    try {
      setLoading(true);

      const response = await getResources();

      setResources(response.data);

      setShowResources(true);
      setShowReservations(false);
      setShowReservationForm(false);
      setShowNotifications(false);
      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Could not load resources"
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
      setShowNotifications(false);
      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Could not load resources"
      );
    }
  };

  const makeReservation = async (slotsToBook) => {
    if (!resourceId) {
      throw new Error("Please select a resource first.");
    }

    let response;

    if (Array.isArray(slotsToBook) && slotsToBook.length > 0) {
      response = await createReservation(resourceId, null, null, slotsToBook);
    } else if (startTime && endTime) {
      if (new Date(startTime) >= new Date(endTime)) {
        throw new Error("End time must be after start time.");
      }
      response = await createReservation(resourceId, startTime, endTime);
    } else {
      throw new Error("Please select at least one available time slot.");
    }

    // Refresh notifications in case any system notification was triggered
    fetchNotifications(true);

    return response;
  };

  const viewReservations = async () => {
    try {
      setLoading(true);

      const response = await getMyReservations();

      setReservations(response.data);

      setShowReservations(true);
      setShowResources(false);
      setShowReservationForm(false);
      setShowNotifications(false);

      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Could not load reservations"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async () => {
    if (showNotifications) {
      setShowNotifications(false);
      return;
    }

    setShowNotifications(true);
    setShowResources(false);
    setShowReservations(false);
    setShowReservationForm(false);
    setMessage("");

    await fetchNotifications(false);
  };

  const handleCancelReservation = async (reservationId) => {
    try {
      const response = await cancelReservation(reservationId);

      setMessage(
        response.data.message || "Reservation cancelled successfully"
      );

      const updated = await getMyReservations();
      setReservations(updated.data);

      fetchNotifications(true);
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Could not cancel reservation"
      );
    }
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div>
          <h2>🏫 CampusReserve</h2>
          <span>College Resource Reservation System</span>
        </div>

        <div className="navbar-actions">
          <button
            type="button"
            className={`nav-notification-btn ${unreadCount > 0 ? "has-unread" : ""}`}
            onClick={toggleNotifications}
            title={
              unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "Notifications"
            }
            aria-label="Notifications"
          >
            <span className="nav-bell-icon">🔔</span>
            {unreadCount > 0 && (
              <span className="notification-badge-nav">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <h1>Welcome, {user?.name} 👋</h1>

        <p className="subtitle">
          Manage your college resources and reservations.
        </p>

        <div className="cards">
          <div
            className={`card notification-card ${
              unreadCount > 0 ? "has-unread-notifications" : ""
            }`}
          >
            <div className="card-header-with-badge">
              <h3>🔔 Notifications</h3>
              {unreadCount > 0 ? (
                <span className="notification-badge-card pulse">
                  <span className="badge-dot"></span>
                  {unreadCount} New
                </span>
              ) : notifications.length > 0 ? (
                <span className="notification-badge-card-muted">
                  {notifications.length} Total
                </span>
              ) : null}
            </div>

            <p>
              {unreadCount > 0
                ? `You have ${unreadCount} unread update${unreadCount > 1 ? "s" : ""} on your reservations.`
                : "View updates about your reservations."}
            </p>

            <button
              type="button"
              onClick={toggleNotifications}
              disabled={loading}
              className={unreadCount > 0 ? "btn-notifications-unread" : ""}
            >
              {loading
                ? "Loading..."
                : showNotifications
                ? "Hide Notifications"
                : unreadCount > 0
                ? `View Notifications (${unreadCount} new)`
                : "View Notifications"}
            </button>
          </div>

          <div className="card">
            <h3>🏫 College Resources</h3>
            <p>View available college resources.</p>
            <button onClick={viewResources} disabled={loading}>
              {loading ? "Loading..." : "View Resources"}
            </button>
          </div>

          <div className="card">
            <h3>📅 Make Reservation</h3>
            <p>Reserve a college resource.</p>
            <button onClick={openReservationForm}>Reserve Resource</button>
          </div>

          <div className="card">
            <h3>📋 My Reservations</h3>
            <p>View your current reservations.</p>
            <button onClick={viewReservations} disabled={loading}>
              {loading ? "Loading..." : "View Reservations"}
            </button>
          </div>
        </div>

        {message && <div className="message">{message}</div>}

        {showResources && <ResourceList resources={resources} />}

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
            cancelReservation={handleCancelReservation}
          />
        )}

        {showNotifications && (
          <Notifications
            notifications={notifications}
            setNotifications={setNotifications}
            onRefresh={() => fetchNotifications(true)}
          />
        )}

        <div className="profile-card">
          <h2>👤 My Profile</h2>
          <p>
            <strong>Name:</strong> {user?.name}
          </p>
          <p>
            <strong>Email:</strong> {user?.email}
          </p>
          <p>
            <strong>Role:</strong> {user?.role}
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;