function MyReservations({
  reservations,
  cancelReservation,
}) {

  const canCancelReservation = (createdAt) => {
    const bookingTime = new Date(createdAt).getTime();
    const twoHours = 2 * 60 * 60 * 1000;

    return new Date().getTime() - bookingTime < twoHours;
  };

  return (
    <div className="profile-card">

      <h2>📋 My Reservations</h2>

      {reservations.length === 0 ? (
        <p>You have no reservations.</p>
      ) : (
        reservations.map((reservation) => (
          <div
            key={reservation.id}
            className="resource-item"
          >

            <p>
              <strong>Reservation ID:</strong>{" "}
              {reservation.id}
            </p>

            <p>
              <strong>Resource:</strong>{" "}
              {reservation.resource_name}
            </p>

            <p>
              <strong>Start:</strong>{" "}
              {reservation.start_time}
            </p>

            <p>
              <strong>End:</strong>{" "}
              {reservation.end_time}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {reservation.status}
            </p>

            {["pending", "approved"].includes(reservation.status) &&
canCancelReservation(reservation.created_at) ? (
              <button
                onClick={() =>
                  cancelReservation(reservation.id)
                }
              >
                Cancel Reservation
              </button>
            ) : (
              <span>
                Cancellation period expired
              </span>
            )}

            <hr />

          </div>
        ))
      )}

    </div>
  );
}

export default MyReservations;