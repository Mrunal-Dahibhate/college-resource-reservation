import { useState } from "react";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../../services/api";

function Notifications({ notifications, setNotifications, onRefresh }) {
  const [actionLoading, setActionLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: 1 } : item))
    );

    try {
      await markNotificationAsRead(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(true);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: 1 }))
      );
      await markAllNotificationsAsRead();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    try {
      await deleteNotification(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  const getStatusBadge = (message) => {
    const upper = (message || "").toUpperCase();
    if (upper.includes("APPROVED")) {
      return <span className="status-badge-chip approved">✓ Approved</span>;
    }
    if (upper.includes("REJECTED")) {
      return <span className="status-badge-chip rejected">✕ Rejected</span>;
    }
    if (upper.includes("CANCELLED")) {
      return <span className="status-badge-chip cancelled">⊘ Cancelled</span>;
    }
    return <span className="status-badge-chip info">ℹ Info</span>;
  };

  return (
    <div className="profile-card notifications-card">
      <div className="notifications-header">
        <div className="notifications-title-area">
          <h2>🔔 Notifications</h2>
          <div className="notifications-badge-group">
            {unreadCount > 0 ? (
              <span className="notification-badge-unread-pill">
                <span className="badge-pulse-dot"></span>
                {unreadCount} Unread
              </span>
            ) : (
              <span className="notification-badge-caught-up-pill">
                ✓ All caught up
              </span>
            )}
            <span className="notification-badge-total-pill">
              {notifications.length} Total
            </span>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="mark-all-read-btn"
            onClick={handleMarkAllAsRead}
            disabled={actionLoading}
          >
            {actionLoading ? "Updating..." : "✓ Mark all as read"}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-notifications">
          <div className="empty-bell-icon">🔕</div>
          <p className="empty-title">No notifications yet</p>
          <small className="empty-subtitle">
            You will receive updates here whenever your reservation requests are approved or rejected.
          </small>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => {
            const isUnread = !notification.is_read;
            return (
              <div
                key={notification.id}
                className={`notification-item ${isUnread ? "is-unread" : "is-read"}`}
              >
                <div className="notification-item-main">
                  <div className="notification-item-header">
                    <div className="notification-tags">
                      {isUnread ? (
                        <span className="notification-item-badge new">
                          <span className="badge-dot"></span>
                          NEW
                        </span>
                      ) : (
                        <span className="notification-item-badge read">Read</span>
                      )}
                      {getStatusBadge(notification.message)}
                    </div>

                    <small className="notification-time">
                      {new Date(notification.created_at).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </small>
                  </div>

                  <p className="notification-text">
                    {notification.message}
                  </p>
                </div>

                <div className="notification-actions">
                  {isUnread && (
                    <button
                      type="button"
                      className="mark-single-read-btn"
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    className="delete-single-btn"
                    onClick={() => handleDelete(notification.id)}
                    title="Delete notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Notifications;