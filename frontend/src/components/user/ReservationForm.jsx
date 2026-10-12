import { useState, useEffect } from "react";
import { getResourceSlots, getResourceAvailability } from "../../services/api";

const TOTAL_SLOTS = 9; // 9 AM to 6 PM = 9 one-hour slots

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
  const [selectedDate, setSelectedDate] = useState("");
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [slotsData, setSlotsData] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formError, setFormError] = useState("");
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatLocalDate(today);

  // Build the next 15 days (today + 1 through today + 15)
  const next15Days = [];
  for (let i = 1; i <= 15; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    next15Days.push({
      dateStr: formatLocalDate(d),
      date: d,
      dayNum: d.getDate(),
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      monthName: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }

  const selectedResource = resources.find(
    (r) => String(r.id) === String(resourceId)
  );

  // Fetch availability for the next 15 days when resource changes
  useEffect(() => {
    if (!resourceId) {
      setAvailabilityMap({});
      setSlotsData(null);
      setSelectedDate("");
      return;
    }

    const start = next15Days[0]?.dateStr;
    const end = next15Days[next15Days.length - 1]?.dateStr;
    if (!start || !end) return;

    const fetchAvailability = async () => {
      try {
        setLoadingAvailability(true);
        const res = await getResourceAvailability(resourceId, start, end, null);
        setAvailabilityMap(res.data?.dates || {});
      } catch (err) {
        console.error("Failed to load availability:", err);
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchAvailability();
    setSelectedDate("");
    setSlotsData(null);
  }, [resourceId]);

  // Fetch slots when date is selected
  useEffect(() => {
    if (!resourceId || !selectedDate) return;

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setFormError("");
        setSuccessMsg("");
        const res = await getResourceSlots(resourceId, selectedDate);
        setSlotsData(res.data);
      } catch (err) {
        setFormError("Could not load time slots. Please try again.");
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [resourceId, selectedDate]);

  const handleResourceChange = (val) => {
    setResourceId(val);
    setSelectedDate("");
    setSlotsData(null);
    setFormError("");
    setSuccessMsg("");
    setStartTime("");
    setEndTime("");
  };

  const handleSelectDate = (dayObj) => {
    const dayData = availabilityMap[dayObj.dateStr];
    if (dayData?.isFullyBooked) {
      setFormError("All slots for this date are booked. Please choose another date.");
      return;
    }
    setFormError("");
    setSuccessMsg("");
    setSelectedDate(dayObj.dateStr);
  };

  // Color for remaining slots count
  const getSlotCountColor = (available) => {
    if (available === null || available === undefined) return "#22c55e"; // green default
    if (available < 3) return "#ef4444"; // red
    if (available < 5) return "#f97316"; // orange
    return "#22c55e"; // green
  };

  // Book a single slot directly
  const handleBookNow = async (slot) => {
    if (bookingInProgress) return;
    try {
      setBookingInProgress(true);
      setFormError("");
      setSuccessMsg("");
      await makeReservation([
        {
          start_time: slot.startDateTime,
          end_time: slot.endDateTime,
        },
      ]);
      setSuccessMsg(`✅ Slot "${slot.slotName || slot.label}" booked successfully!`);
      // Refresh slots
      const res = await getResourceSlots(resourceId, selectedDate);
      setSlotsData(res.data);
      // Refresh availability
      const start = next15Days[0]?.dateStr;
      const end = next15Days[next15Days.length - 1]?.dateStr;
      const avRes = await getResourceAvailability(resourceId, start, end, null);
      setAvailabilityMap(avRes.data?.dates || {});
    } catch (err) {
      setFormError(
        err?.response?.data?.error || "Failed to book slot. Please try again."
      );
    } finally {
      setBookingInProgress(false);
    }
  };

  const formattedSelectedDate = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="rf-wrapper">
      {/* HEADER */}
      <div className="rf-header">
        <h2>📅 Book a Resource</h2>
        <p>Resources are available <strong>9:00 AM – 6:00 PM</strong>, Mon–Sun. Book up to <strong>15 days</strong> in advance.</p>
      </div>

      {/* STEP 1: SELECT RESOURCE */}
      <div className="rf-card">
        <div className="rf-step-badge">Step 1</div>
        <label className="rf-step-label">Select Resource</label>
        <select
          className="rf-select"
          value={resourceId}
          onChange={(e) => handleResourceChange(e.target.value)}
        >
          <option value="">-- Choose a Resource --</option>
          {resources
            .filter((r) => r.status === "available")
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.type})
              </option>
            ))}
        </select>

        {selectedResource && (
          <div className="rf-resource-meta">
            <span>📍 {selectedResource.location}</span>
            <span>👥 Capacity: {selectedResource.capacity}</span>
            <span>⏰ 9:00 AM – 6:00 PM (9 Slots/Day)</span>
          </div>
        )}
      </div>

      {/* STEP 2: CALENDAR — next 15 days only */}
      {resourceId && (
        <div className="rf-card">
          <div className="rf-step-badge">Step 2</div>
          <label className="rf-step-label">
            Select a Date
            {loadingAvailability && <span className="rf-loading-inline"> Loading...</span>}
          </label>
          <p className="rf-step-hint">
            Select any of the next 15 available dates below. The number shows remaining slots.
          </p>

          <div className="rf-calendar-strip">
            {next15Days.map((dayObj) => {
              const dayData = availabilityMap[dayObj.dateStr];
              const available = dayData ? dayData.availableSlots : TOTAL_SLOTS;
              const isFullyBooked = dayData?.isFullyBooked || false;
              const isSelected = selectedDate === dayObj.dateStr;
              const slotColor = getSlotCountColor(available);

              return (
                <button
                  key={dayObj.dateStr}
                  type="button"
                  className={`rf-day-card ${isSelected ? "rf-day-selected" : ""} ${isFullyBooked ? "rf-day-full" : ""}`}
                  onClick={() => !isFullyBooked && handleSelectDate(dayObj)}
                  disabled={isFullyBooked}
                  title={isFullyBooked ? "Fully Booked" : `${available} slot(s) available`}
                >
                  <span className="rf-day-name">{dayObj.dayName}</span>
                  <span className="rf-day-num">{dayObj.dayNum}</span>
                  <span className="rf-day-month">{dayObj.monthName}</span>
                  {isFullyBooked ? (
                    <span className="rf-slot-count" style={{ color: "#ef4444" }}>Full</span>
                  ) : (
                    <span className="rf-slot-count" style={{ color: slotColor }}>
                      {available} left
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerts */}
      {formError && <div className="rf-alert-error">{formError}</div>}
      {successMsg && <div className="rf-alert-success">{successMsg}</div>}

      {/* STEP 3: SLOTS TABLE */}
      {resourceId && selectedDate && (
        <div className="rf-card">
          <div className="rf-step-badge">Step 3</div>
          <label className="rf-step-label">
            Available Slots — <span className="rf-date-highlight">{formattedSelectedDate}</span>
          </label>

          {/* Stats Row */}
          {slotsData && !loadingSlots && (
            <div className="rf-stats-row">
              <div className="rf-stat rf-stat-green">
                <span className="rf-stat-num">{slotsData.availableSlots}</span>
                <span className="rf-stat-lbl">Available</span>
              </div>
              <div className="rf-stat rf-stat-red">
                <span className="rf-stat-num">{slotsData.bookedSlots}</span>
                <span className="rf-stat-lbl">Booked</span>
              </div>
              <div className="rf-stat rf-stat-grey">
                <span className="rf-stat-num">{slotsData.totalSlots}</span>
                <span className="rf-stat-lbl">Total</span>
              </div>
            </div>
          )}

          {loadingSlots ? (
            <div className="rf-loading-block">⏳ Loading slots...</div>
          ) : slotsData ? (
            <div className="rf-table-wrapper">
              <table className="rf-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Time Slot</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {slotsData.slots.map((slot, i) => (
                    <tr
                      key={slot.id}
                      className={slot.isBooked ? "rf-row-booked" : "rf-row-available"}
                    >
                      <td className="rf-td-num">{i + 1}</td>
                      <td className="rf-td-time">
                        <span className="rf-slot-name">{slot.slotName || slot.label}</span>
                        <span className="rf-slot-label-small">{slot.label}</span>
                      </td>
                      <td className="rf-td-dur">1 Hour</td>
                      <td className="rf-td-status">
                        {slot.isBooked ? (
                          <span className="rf-badge-booked">🔒 Booked</span>
                        ) : (
                          <span className="rf-badge-available">🟢 Available</span>
                        )}
                      </td>
                      <td className="rf-td-action">
                        {slot.isBooked ? (
                          <span className="rf-btn-booked-label">Already Booked</span>
                        ) : (
                          <button
                            type="button"
                            className="rf-btn-book-now"
                            disabled={bookingInProgress}
                            onClick={() => handleBookNow(slot)}
                          >
                            {bookingInProgress ? "Booking..." : "Book Now"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rf-no-slots">No slot data available.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ReservationForm;