function ReservationForm({
  resources,
  resourceId,
  setResourceId,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  makeReservation,
}) {
  return (
    <div className="profile-card">

      <h2>📅 Make a Reservation</h2>

      <label>
        Select Resource
      </label>

      <select
        value={resourceId}
        onChange={(e) =>
          setResourceId(e.target.value)
        }
      >
        <option value="">
          -- Select Resource --
        </option>

        {resources
          .filter(
            (resource) =>
              resource.status === "available"
          )
          .map((resource) => (
            <option
              key={resource.id}
              value={resource.id}
            >
              {resource.name} - {resource.type}
            </option>
          ))}
      </select>

      <label>
        Start Time
      </label>

      <input
        type="datetime-local"
        value={startTime}
        onChange={(e) =>
          setStartTime(e.target.value)
        }
      />
      <label>
        End Time
      </label>

      <input
        type="datetime-local"
        value={endTime}
        onChange={(e) =>
          setEndTime(e.target.value)
        }
      />

      <button onClick={makeReservation}>
        Reserve Resource
      </button>

    </div>
  );
}

export default ReservationForm;