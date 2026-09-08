function MyReservations({
  reservations,
  cancelReservation,
}) {
  return (
    <div className="profile-card">

      <h2>📋 My Reservations</h2>

      {reservations.length === 0 ? (
        <p>
          You have no reservations.
        </p>
      ) : (
        reservations.map((reservation) => (
          <div
            key={reservation.id}
            className="resource-item"
          >

            <p>
              <strong>
                Reservation ID:
              </strong>{" "}
              {reservation.id}
            </p>

            <p>
              <strong>
                Resource:
              </strong>{" "}
              {reservation.resource_name}
            </p>

            <p>
              <strong>
                Start:
              </strong>{" "}
              {reservation.start_time}
            </p>

            <p>
              <strong>
                End:
              </strong>{" "}
              {reservation.end_time}
            </p>

            <p>
              <strong>
                Status:
              </strong>{" "}
              {reservation.status}
            </p>

            {reservation.status !== "cancelled" &&
              reservation.status !== "rejected" && (
                <button
                  onClick={() =>
                    cancelReservation(
                      reservation.id
                    )
                  }
                >
                  Cancel Reservation
                </button>
              )}

            <hr />

          </div>
        ))
      )}

    </div>
  );
}

export default MyReservations;