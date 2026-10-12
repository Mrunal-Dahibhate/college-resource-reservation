import { useState, useEffect } from "react";
import { getResourceSlots, getResourceAvailability } from "../../services/api";

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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState("");
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [slotsData, setSlotsData] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [slotRangeEndId, setSlotRangeEndId] = useState(null);
  const [formError, setFormError] = useState("");

  const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const todayStr = formatLocalDate(new Date());

  // Selected resource object
  const selectedResource = resources.find(
    (r) => String(r.id) === String(resourceId)
  );

  // Month string for API, e.g. "2026-10"
  const currentMonthStr = `${currentMonth.getFullYear()}-${String(
    currentMonth.getMonth() + 1
  ).padStart(2, "0")}`;

  // Fetch month availability whenever resource or current month changes
  useEffect(() => {
    if (!resourceId) {
      setAvailabilityMap({});
      setSlotsData(null);
      setSelectedDate("");
      setSelectedSlotId(null);
      setSlotRangeEndId(null);
      return;
    }

    const fetchAvailability = async () => {
      try {
        setLoadingAvailability(true);
        setFormError("");
        const res = await getResourceAvailability(
          resourceId,
          null,
          null,
          currentMonthStr
        );
        const dates = res.data?.dates || {};
        setAvailabilityMap(dates);

        // If previously selected date is now fully booked, clear it
        if (selectedDate && dates[selectedDate]?.isFullyBooked) {
          setSelectedDate("");
          setSlotsData(null);
          setSelectedSlotId(null);
          setSlotRangeEndId(null);
          setStartTime("");
          setEndTime("");
          setFormError(
            `The selected date (${selectedDate}) has become fully booked.`
          );
        }
      } catch (err) {
        console.error("Failed to load resource availability:", err);
        setFormError("Could not load date availability. Please try again.");
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchAvailability();
  }, [resourceId, currentMonthStr]);

  // Fetch slots whenever selectedDate or resourceId changes
  useEffect(() => {
    if (!resourceId || !selectedDate) {
      setSlotsData(null);
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setFormError("");
        const res = await getResourceSlots(resourceId, selectedDate);
        setSlotsData(res.data);
      } catch (err) {
        console.error("Failed to fetch slots for date:", err);
        setFormError("Could not load time slots for this date.");
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [resourceId, selectedDate]);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  // Empty offset days for grid alignment
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ isEmpty: true, key: `empty-${i}` });
  }

  // Actual days in the month
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    const isPast = dayStr < todayStr;
    const isToday = dayStr === todayStr;
    const dayData = availabilityMap[dayStr];
    const isFullyBooked = dayData ? dayData.isFullyBooked : false;
    const availableCount = dayData ? dayData.availableSlots : null;
    const bookedCount = dayData ? dayData.bookedSlots : null;

    calendarDays.push({
      isEmpty: false,
      dayNumber: d,
      dateStr: dayStr,
      isPast,
      isToday,
      isFullyBooked,
      availableCount,
      bookedCount,
      isSelected: selectedDate === dayStr,
      key: dayStr,
    });
  }

  // Handle clicking a date cell
  const handleSelectDate = (day) => {
    if (day.isPast) return;
    if (day.isFullyBooked) {
      setFormError(
        `All slots for ${day.dateStr} are booked. Please select an available date.`
      );
      return;
    }

    setFormError("");
    setSelectedDate(day.dateStr);
    setSelectedSlotId(null);
    setSlotRangeEndId(null);
    setStartTime("");
    setEndTime("");
  };

  // Handle clicking an available time slot
  const handleSlotClick = (slot) => {
    if (slot.isBooked) return;

    if (!selectedSlotId || slotRangeEndId || slot.id === selectedSlotId) {
      // Single slot selection
      setSelectedSlotId(slot.id);
      setSlotRangeEndId(null);
      setStartTime(`${selectedDate} ${slot.startTime}:00`);
      setEndTime(`${selectedDate} ${slot.endTime}:00`);
      setFormError("");
    } else {
      // User clicked a second slot: determine range
      const slots = slotsData?.slots || [];
      const startId = Math.min(selectedSlotId, slot.id);
      const endId = Math.max(selectedSlotId, slot.id);

      // Verify that all slots between startId and endId are available
      const rangeSlots = slots.filter((s) => s.id >= startId && s.id <= endId);
      const hasBooked = rangeSlots.some((s) => s.isBooked);

      if (hasBooked) {
        // Can't select range with booked slot inside; fall back to single slot
        setSelectedSlotId(slot.id);
        setSlotRangeEndId(null);
        setStartTime(`${selectedDate} ${slot.startTime}:00`);
        setEndTime(`${selectedDate} ${slot.endTime}:00`);
      } else {
        setSelectedSlotId(startId);
        setSlotRangeEndId(endId);
        const first = rangeSlots[0];
        const last = rangeSlots[rangeSlots.length - 1];
        setStartTime(`${selectedDate} ${first.startTime}:00`);
        setEndTime(`${selectedDate} ${last.endTime}:00`);
        setFormError("");
      }
    }
  };

  // Format month name for display
  const monthName = currentMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Calculate formatted summary for selected time
  const getSelectedTimeSummary = () => {
    if (!slotsData || !selectedSlotId) return null;
    const slots = slotsData.slots || [];
    if (!slotRangeEndId) {
      const slot = slots.find((s) => s.id === selectedSlotId);
      return slot ? `${slot.label} (1 Hour)` : null;
    } else {
      const first = slots.find((s) => s.id === selectedSlotId);
      const last = slots.find((s) => s.id === slotRangeEndId);
      if (!first || !last) return null;
      const count = slotRangeEndId - selectedSlotId + 1;
      return `${first.startTime} to ${last.endTime} (${count} Hours)`;
    }
  };

  return (
    <div className="reservation-booking-wrapper">
      <div className="reservation-header-box">
        <h2>📅 Book a College Resource</h2>
        <p className="reservation-subtext">
          Select a resource, pick an open date, and choose an available time slot.
        </p>
      </div>

      {formError && <div className="reservation-alert-error">{formError}</div>}

      {/* STEP 1: SELECT RESOURCE */}
      <div className="reservation-step-card">
        <div className="step-badge">Step 1</div>
        <label className="step-label">Select Resource</label>
        <select
          className="resource-dropdown"
          value={resourceId}
          onChange={(e) => {
            setResourceId(e.target.value);
            setSelectedDate("");
            setSlotsData(null);
            setSelectedSlotId(null);
            setSlotRangeEndId(null);
            setStartTime("");
            setEndTime("");
          }}
        >
          <option value="">-- Choose an Available Resource --</option>
          {resources
            .filter((resource) => resource.status === "available")
            .map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name} ({resource.type})
              </option>
            ))}
        </select>

        {selectedResource && (
          <div className="resource-meta-preview">
            <span className="meta-chip">📍 {selectedResource.location}</span>
            <span className="meta-chip">👥 Capacity: {selectedResource.capacity}</span>
            <span className="meta-chip">✨ {selectedResource.facilities}</span>
          </div>
        )}
      </div>

      {/* STEP 2: SELECT DATE (CALENDAR VIEW) */}
      {resourceId && (
        <div className="reservation-step-card">
          <div className="step-badge">Step 2</div>
          <div className="step-header-row">
            <div>
              <label className="step-label">Select Booking Date</label>
              <span className="step-hint">
                Dates with all slots booked are disabled.
              </span>
            </div>
            {loadingAvailability && (
              <span className="loading-indicator-inline">Loading availability...</span>
            )}
          </div>

          {/* CALENDAR WIDGET */}
          <div className="calendar-widget">
            <div className="calendar-nav-bar">
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={handlePrevMonth}
                title="Previous Month"
              >
                ◀
              </button>
              <h3 className="calendar-month-title">{monthName}</h3>
              <button
                type="button"
                className="calendar-nav-btn"
                onClick={handleNextMonth}
                title="Next Month"
              >
                ▶
              </button>
            </div>

            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div key={dayName} className="calendar-weekday-cell">
                  {dayName}
                </div>
              ))}

              {calendarDays.map((day) => {
                if (day.isEmpty) {
                  return (
                    <div
                      key={day.key}
                      className="calendar-day-cell empty-cell"
                    />
                  );
                }

                const isDisabled = day.isPast || day.isFullyBooked;

                let cellClass = "calendar-day-cell";
                if (day.isPast) cellClass += " past-day";
                if (day.isFullyBooked) cellClass += " fully-booked-day disabled";
                if (day.isSelected) cellClass += " selected-day";
                if (day.isToday) cellClass += " today-day";
                if (!isDisabled && !day.isSelected) cellClass += " available-day";

                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={isDisabled}
                    className={cellClass}
                    onClick={() => handleSelectDate(day)}
                    title={
                      day.isPast
                        ? "Past date"
                        : day.isFullyBooked
                        ? `Fully Booked - All ${day.bookedCount || 10} slots reserved`
                        : `${day.availableCount ?? "Multiple"} slots available`
                    }
                  >
                    <span className="day-number">{day.dayNumber}</span>

                    {/* Status Badge inside Day Tile */}
                    {day.isFullyBooked && !day.isPast && (
                      <span className="day-pill-status fully-booked-pill">
                        Full
                      </span>
                    )}

                    {!day.isPast &&
                      !day.isFullyBooked &&
                      day.availableCount !== null && (
                        <span className="day-pill-status open-pill">
                          {day.availableCount} open
                        </span>
                      )}
                  </button>
                );
              })}
            </div>

            {/* CALENDAR LEGEND */}
            <div className="calendar-legend-bar">
              <div className="legend-item">
                <span className="legend-dot available-dot"></span>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot booked-dot"></span>
                <span>Fully Booked (Disabled)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot selected-dot"></span>
                <span>Selected</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot past-dot"></span>
                <span>Past</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SLOT AVAILABILITY BREAKDOWN & SLOT SELECTION */}
      {resourceId && selectedDate && (
        <div className="reservation-step-card slot-section-card">
          <div className="step-badge">Step 3</div>
          <label className="step-label">
            Slot Availability for{" "}
            <strong>
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </strong>
          </label>

          {loadingSlots ? (
            <div className="slot-loading-state">
              <span className="spinner-icon">⏳</span> Loading time slots...
            </div>
          ) : slotsData ? (
            <>
              {/* SLOTS SUMMARY STATS CARDS */}
              <div className="slot-stats-container">
                <div className="slot-stat-card available-stat">
                  <span className="stat-label">Available Slots</span>
                  <span className="stat-value">{slotsData.availableSlots}</span>
                  <span className="stat-sub">Ready to book</span>
                </div>

                <div className="slot-stat-card booked-stat">
                  <span className="stat-label">Booked Slots</span>
                  <span className="stat-value">{slotsData.bookedSlots}</span>
                  <span className="stat-sub">Already reserved</span>
                </div>

                <div className="slot-stat-card total-stat">
                  <span className="stat-label">Total Slots</span>
                  <span className="stat-value">{slotsData.totalSlots}</span>
                  <span className="stat-sub">College operating hours</span>
                </div>
              </div>

              {/* AVAILABILITY PROGRESS BAR */}
              <div className="availability-bar-wrapper">
                <div className="availability-bar-labels">
                  <span>Occupancy</span>
                  <span>
                    {Math.round(
                      (slotsData.bookedSlots / slotsData.totalSlots) * 100
                    )}
                    % Booked
                  </span>
                </div>
                <div className="availability-progress-track">
                  <div
                    className="availability-progress-fill"
                    style={{
                      width: `${
                        (slotsData.bookedSlots / slotsData.totalSlots) * 100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* TIME SLOTS GRID */}
              <div className="slots-picker-header">
                <h4>Choose an Available Slot:</h4>
                <span className="slot-instruction-hint">
                  Click an available slot to book. (Click a second slot to select consecutive hours)
                </span>
              </div>

              <div className="slots-grid">
                {slotsData.slots.map((slot) => {
                  const isBooked = slot.isBooked;

                  // Check if this slot is selected or inside selected range
                  let isSelected = false;
                  if (selectedSlotId) {
                    if (!slotRangeEndId) {
                      isSelected = slot.id === selectedSlotId;
                    } else {
                      isSelected =
                        slot.id >= selectedSlotId && slot.id <= slotRangeEndId;
                    }
                  }

                  let slotBtnClass = "slot-chip-btn";
                  if (isBooked) slotBtnClass += " slot-booked";
                  else if (isSelected) slotBtnClass += " slot-selected";
                  else slotBtnClass += " slot-available";

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isBooked}
                      className={slotBtnClass}
                      onClick={() => handleSlotClick(slot)}
                      title={
                        isBooked
                          ? "This time slot is already reserved"
                          : `Click to select ${slot.label}`
                      }
                    >
                      <div className="slot-chip-main">
                        <span className="slot-clock-icon">🕒</span>
                        <span className="slot-time-text">{slot.label}</span>
                      </div>
                      <span className="slot-badge-status">
                        {isBooked
                          ? "🔒 Booked"
                          : isSelected
                          ? "✓ Selected"
                          : "🟢 Available"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* SELECTED TIME PREVIEW */}
              {selectedSlotId && (
                <div className="selected-slot-preview-card">
                  <div className="preview-icon">✨</div>
                  <div className="preview-info">
                    <strong>Selected Time Slot:</strong>
                    <span>
                      {getSelectedTimeSummary()} on {selectedDate}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="no-slots-notice">No slot information available.</p>
          )}
        </div>
      )}

      {/* CONFIRM / SUBMIT BUTTON */}
      <div className="reservation-submit-footer">
        <button
          type="button"
          className="reserve-submit-btn"
          disabled={!resourceId || !selectedDate || !startTime || !endTime}
          onClick={makeReservation}
        >
          {!resourceId
            ? "1. Select a Resource First"
            : !selectedDate
            ? "2. Select an Available Date"
            : !startTime
            ? "3. Select an Available Time Slot"
            : "Confirm & Reserve Resource 🚀"}
        </button>
      </div>
    </div>
  );
}

export default ReservationForm;