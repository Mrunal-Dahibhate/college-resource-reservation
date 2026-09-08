function AdminReservations({
  reservations,
  handleApproveReservation,
  handleRejectReservation,
}) {
  return (
    <div>
      <h1>📋 Reservations</h1>

      {reservations.length === 0 ? (
        <p>No reservations found.</p>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Resource</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td>{reservation.id}</td>

                  <td>
                    {reservation.user_name}
                  </td>

                  <td>
                    {reservation.resource_name}
                  </td>

                  <td>
                    {reservation.start_time}
                  </td>

                  <td>
                    {reservation.end_time}
                  </td>

                  <td>
  <span
    className={`status-badge status-${reservation.status}`}
  >
    {reservation.status}
  </span>
</td>

                  <td>
                    {reservation.status === "pending" && (
                      <>
                        <button
  className="approve-btn"
  onClick={() =>
    handleApproveReservation(
      reservation.id
    )
  }
>
  ✅ Approve
</button>

<button
  className="reject-btn"
  onClick={() =>
    handleRejectReservation(
      reservation.id
    )
  }
>
  ❌ Reject
</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminReservations;