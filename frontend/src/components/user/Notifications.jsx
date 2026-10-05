function Notifications({ notifications }) {
  return (
    <div className="profile-card notifications-card">

      <h2>🔔 Notifications</h2>

      {notifications.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className="notification-item"
          >
            <p>
              <strong>🔔</strong>{" "}
              {notification.message}
            </p>

            <small>
              {new Date(
                notification.created_at
              ).toLocaleString()}
            </small>

            <hr />
          </div>
        ))
      )}

    </div>
  );
}

export default Notifications;