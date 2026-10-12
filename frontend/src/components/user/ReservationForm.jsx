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
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [formError, setFormError] = useState("");
  const [bookingInProgress, setBookingInProgress] = useState(false);

  const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatLocalDate(today);

  // 15 days advance booking maximum date
  const maxAdvanceDate = new Date(today);
  maxAdvanceDate.setDate(maxAdvanceDate.getDate() + 15);
  const maxAdvanceStr = formatLocalDate(maxAdvanceDate);

  // Selected resource object
  const selectedResource = resources.find(
    (r) => String(r.id) === String(resourceId)
  );

  // Month string for API, e.g. "2026-10"
  const currentMonthStr = `${currentMonth.getFullYear()}-${String(
    currentMonth.getMonth() + 1
  ).padStart(2, "0")}`;

  // Reset date and slots when resource changes
  const handleResourceChange = (newResourceId) => {
    setResourceId(newResourceId);
    setSelectedDate("");
    setSlotsData(null);
    setSelectedSlotIds([]);
    setStartTime("");
    setEndTime("");
    setFormError("");
  };

  // Fetch month availability whenever resource or current month changes
  useEffect(() => {
    if (!resourceId) {
      setAvailabilityMap({});
      setSlotsData(null);
      setSelectedDate("");
      setSelectedSlotIds([]);
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
          setSelectedSlotIds([]);
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
      setSelectedSlotIds([]);
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setFormError("");
        const res = await getResourceSlots(resourceId, selectedDate);
        setSlotsData(res.data);
        setSelectedSlotIds([]); // Clear previous slot selections for new date
      } catch (err) {
        console.error("Failed to fetch slots for date:", err);
        setFormError("Could not load time slots for this date.");
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [resourceId, selectedDate]);

  // Update legacy startTime / endTime when selectedSlotIds change
  useEffect(() => {
    if (!slotsData || selectedSlotIds.length === 0) {
      setStartTime("");
      setEndTime("");
      return;
    }

    const selectedSlots = (slotsData.slots || [])
      .filter((s) => selectedSlotIds.includes(s.id))
      .sort((a, b) => a.id - b.id);

    if (selectedSlots.length > 0) {
      setStartTime(selectedSlots[0].startDateTime);
      setEndTime(selectedSlots[selectedSlots.length - 1].endDateTime);
    }
  }, [selectedSlotIds, slotsData]);

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
    const isBeyond15Days = dayStr > maxAdvanceStr;
    const dayData = availabilityMap[dayStr];
    const isFullyBooked = dayData ? dayData.isFullyBooked : false;
    const availableCount = dayData ? dayData.availableSlots : (isPast || isBeyond15Days ? 0 : 10);
    const bookedCount = dayData ? dayData.bookedSlots : 0;

    calendarDays.push({
      isEmpty: false,
      dayNumber: d,
      dateStr: dayStr,
      isPast,
      isToday,
      isBeyond15Days,
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
    if (day.isBeyond15Days) {
      setFormError(
        `Advance booking is only allowed up to 15 days (${maxAdvanceStr}).`
      );
      return;
    }
    if (day.isFullyBooked) {
      setFormError(
        `All 10 slots for ${day.dateStr} are already booked. Please choose another date.`
      );
      return;
    }

    setFormError("");
    setSelectedDate(day.dateStr);
    setSelectedSlotIds([]);
  };

  // Slot selection handlers
  const toggleSlot = (slotId) => {
    const slot = (slotsData?.slots || []).find((s) => s.id === slotId);
    if (!slot || slot.isBooked) return;

    setSelectedSlotIds((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      } else {
        return [...prev, slotId].sort((a, b) => a - b);
      }
    });
    setFormError("");
  };

  const handleSelectAllAvailable = () => {
    if (!slotsData?.slots) return;
    const availableIds = slotsData.slots
      .filter((s) => !s.isBooked)
      .map((s) => s.id);
    setSelectedSlotIds(availableIds);
    setFormError("");
  };

  const handleClearSelection = () => {
    setSelectedSlotIds([]);
    setFormError("");
  };

  // Book a single slot immediately
  const handleBookSingleSlot = async (slot) => {
    if (!slot || slot.isBooked) return;
    try {
      setBookingInProgress(true);
      setFormError("");
      const singleSlotPayload = [
        {
          start_time: slot.startDateTime,
          end_time: slot.endDateTime,
          label: slot.label,
        },
      ];
      await makeReservation(singleSlotPayload);
    } catch (err) {
      console.error(err);
      setFormError("Failed to book slot. Please try again.");
    } finally {
      setBookingInProgress(false);
    }
  };

  // Book all selected slots (multiple slots)
  const handleBookSelectedSlots = async () => {
    if (selectedSlotIds.length === 0) {
      setFormError("Please select at least one available slot from the table.");
      return;
    }

    const selectedSlots = (slotsData?.slots || [])
      .filter((s) => selectedSlotIds.includes(s.id))
      .map((s) => ({
        start_time: s.startDateTime,
        end_time: s.endDateTime,
        label: s.label,
      }));

    try {
      setBookingInProgress(true);
      setFormError("");
      await makeReservation(selectedSlots);
    } catch (err) {
      console.error(err);
      setFormError("Failed to book reservations. Please try again.");
    } finally {
      setBookingInProgress(false);
    }
  };

  // Format month name for display
  const monthName = currentMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const availableSlotsList = (slotsData?.slots || []).filter((s) => !s.isBooked);
  const allAvailableSelected =
    availableSlotsList.length > 0 &&
    availableSlotsList.every((s) => selectedSlotIds.includes(s.id));

  // Formatted date string for header
  const formattedSelectedDate = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="reservation-booking-wrapper">
      <div className="reservation-header-box">
        <h2>📅 Book a College Resource</h2>
        <p className="reservation-subtext">
          Resources are available daily from <strong>8:00 AM to 6:00 PM</strong> in <strong>1-hour slots</strong>. Advance booking is available up to <strong>15 days</strong>.
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
          onChange={(e) => handleResourceChange(e.target.value)}
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
            <span className="meta-chip operating-hours-chip">⏰ Operating Hours: 8:00 AM - 6:00 PM</span>
          </div>
        )}
      </div>

      {/* PROMPT TO SELECT RESOURCE */}
      {!resourceId && (
        <div className="step-placeholder-box">
          <span className="placeholder-icon">👉</span>
          <div>
            <strong>Step 2 & 3: Calendar & Slots</strong>
            <p>Please select a college resource above to view its availability calendar and bookable slots.</p>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT DATE (CALENDAR VIEW) */}
      {resourceId && (
        <div className="reservation-step-card">
          <div className="step-badge">Step 2</div>
          <div className="step-header-row">
            <div>
              <label className="step-label">Select Booking Date</label>
              <span className="step-hint">
                You can book up to <strong>15 days in advance</strong> ({todayStr} to {maxAdvanceStr}). Fully booked dates are disabled.
              </span>
            </div>
            {loadingAvailability && (
              <span className="loading-indicator-inline">Loading availability...</span>
            )}
          </div>

          <div className="advance-booking-notice-bar">
            <span>🗓️ <strong>15-Day Booking Window:</strong> Today ({today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}) through {maxAdvanceDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            <span className="operating-tag">Daily 8:00 AM – 6:00 PM (10 slots)</span>
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

                const isDisabled = day.isPast || day.isBeyond15Days || day.isFullyBooked;

                let cellClass = "calendar-day-cell";
                if (day.isPast) cellClass += " past-day";
                if (day.isBeyond15Days) cellClass += " beyond-window-day disabled";
                if (day.isFullyBooked && !day.isPast && !day.isBeyond15Days) {
                  cellClass += " fully-booked-day disabled";
                }
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
                        : day.isBeyond15Days
                        ? "Beyond 15-day advance booking window"
                        : day.isFullyBooked
                        ? `Fully Booked - All 10 slots reserved`
                        : `${day.availableCount ?? 10} slots remaining out of 10`
                    }
                  >
                    <span className="day-number">{day.dayNumber}</span>

                    {/* Past Date Pill */}
                    {day.isPast && (
                      <span className="day-pill-status past-pill">Past</span>
                    )}

                    {/* Beyond 15-day limit Pill */}
                    {day.isBeyond15Days && !day.isPast && (
                      <span className="day-pill-status beyond-pill">&gt;15d</span>
                    )}

                    {/* Fully Booked Pill */}
                    {day.isFullyBooked && !day.isPast && !day.isBeyond15Days && (
                      <span className="day-pill-status fully-booked-pill">
                        0 left
                      </span>
                    )}

                    {/* Remaining Slots Pill */}
                    {!day.isPast &&
                      !day.isBeyond15Days &&
                      !day.isFullyBooked &&
                      day.availableCount !== null && (
                        <span className="day-pill-status open-pill">
                          {day.availableCount} left
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
                <span>Available (Slots remaining shown)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot booked-dot"></span>
                <span>Fully Booked (0 left / Disabled)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot beyond-dot"></span>
                <span>&gt;15 Days (Advance limit)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot selected-dot"></span>
                <span>Selected</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot past-dot"></span>
                <span>Past Date</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SLOT AVAILABILITY TABLE & MULTI-SLOT SELECTION */}
      {resourceId && selectedDate && (
        <div className="reservation-step-card slot-section-card">
          <div className="step-badge">Step 3</div>
          <div className="slots-header-container">
            <div>
              <label className="step-label">
                Available Slots for <strong>{selectedResource?.name}</strong>
              </label>
              <div className="selected-date-badge-large">
                📅 {formattedSelectedDate}
              </div>
            </div>
            <span className="slot-instruction-hint">
              Each slot is <strong>1 hour</strong>. You can book a particular slot or check multiple slots of this date!
            </span>
          </div>

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
                  <span className="stat-label">Already Booked</span>
                  <span className="stat-value">{slotsData.bookedSlots}</span>
                  <span className="stat-sub">Reserved by others</span>
                </div>

                <div className="slot-stat-card selected-stat">
                  <span className="stat-label">Selected Slots</span>
                  <span className="stat-value">{selectedSlotIds.length}</span>
                  <span className="stat-sub">Your current selection</span>
                </div>

                <div className="slot-stat-card total-stat">
                  <span className="stat-label">Daily Capacity</span>
                  <span className="stat-value">{slotsData.totalSlots}</span>
                  <span className="stat-sub">8:00 AM to 6:00 PM</span>
                </div>
              </div>

              {/* MULTI-SLOT SELECTION TOOLBAR */}
              <div className="slot-table-toolbar">
                <div className="toolbar-info">
                  <strong>Time Slots Table</strong>
                  <span className="table-sub-note">
                    Checkboxes allow selecting multiple slots of this date.
                  </span>
                </div>
                <div className="toolbar-actions">
                  <button
                    type="button"
                    className="btn-toolbar-select-all"
                    onClick={handleSelectAllAvailable}
                    disabled={availableSlotsList.length === 0}
                  >
                    Select All Available ({availableSlotsList.length})
                  </button>
                  <button
                    type="button"
                    className="btn-toolbar-clear"
                    onClick={handleClearSelection}
                    disabled={selectedSlotIds.length === 0}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {/* TABLE FORMAT FOR TIME SLOTS */}
              <div className="slots-table-wrapper">
                <table className="slots-table">
                  <thead>
                    <tr>
                      <th className="th-checkbox">
                        <input
                          type="checkbox"
                          aria-label="Select all available slots"
                          checked={allAvailableSelected}
                          onChange={(e) => {
                            if (e.target.checked) handleSelectAllAvailable();
                            else handleClearSelection();
                          }}
                          disabled={availableSlotsList.length === 0}
                        />
                      </th>
                      <th className="th-index">#</th>
                      <th className="th-time">Time Slot</th>
                      <th className="th-duration">Duration</th>
                      <th className="th-status">Availability Status</th>
                      <th className="th-action">Action / Booking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotsData.slots.map((slot, index) => {
                      const isBooked = slot.isBooked;
                      const isSelected = selectedSlotIds.includes(slot.id);

                      let rowClass = "slot-row";
                      if (isBooked) rowClass += " slot-row-booked";
                      else if (isSelected) rowClass += " slot-row-selected";
                      else rowClass += " slot-row-available";

                      return (
                        <tr
                          key={slot.id}
                          className={rowClass}
                          onClick={(e) => {
                            // Only toggle if not clicking the direct action button
                            if (
                              !isBooked &&
                              !e.target.closest("button") &&
                              !e.target.closest("input")
                            ) {
                              toggleSlot(slot.id);
                            }
                          }}
                        >
                          {/* Checkbox column */}
                          <td className="td-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isBooked}
                              onChange={() => toggleSlot(slot.id)}
                              aria-label={`Select slot ${slot.label}`}
                            />
                          </td>

                          {/* Index column */}
                          <td className="td-index">
                            <span className="slot-num-badge">Slot {index + 1}</span>
                          </td>

                          {/* Time window column */}
                          <td className="td-time">
                            <div className="slot-time-cell">
                              <span className="slot-clock-icon">🕒</span>
                              <span className={`slot-time-label ${isBooked ? "time-booked-strikethrough" : ""}`}>
                                {slot.label}
                              </span>
                            </div>
                          </td>

                          {/* Duration column */}
                          <td className="td-duration">
                            <span className="duration-pill">1 Hour</span>
                          </td>

                          {/* Status column */}
                          <td className="td-status">
                            {isBooked ? (
                              <span className="status-badge-booked">
                                🔒 Already Booked
                              </span>
                            ) : (
                              <span className="status-badge-available">
                                🟢 Available
                              </span>
                            )}
                          </td>

                          {/* Action column */}
                          <td className="td-action">
                            {isBooked ? (
                              <span className="action-text-booked">
                                Already Booked
                              </span>
                            ) : (
                              <div className="slot-actions-cell">
                                <button
                                  type="button"
                                  className={`btn-toggle-slot ${
                                    isSelected ? "btn-toggle-selected" : "btn-toggle-unselected"
                                  }`}
                                  onClick={() => toggleSlot(slot.id)}
                                >
                                  {isSelected ? "✓ Selected" : "+ Select"}
                                </button>
                                <button
                                  type="button"
                                  className="btn-book-instant"
                                  disabled={bookingInProgress}
                                  onClick={() => handleBookSingleSlot(slot)}
                                  title="Book this particular slot directly"
                                >
                                  Book Slot
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* SELECTION SUMMARY & MULTI-SLOT BOOKING SUBMIT */}
              <div className="selected-slots-summary-card">
                <div className="summary-card-header">
                  <div className="summary-left">
                    <span className="sparkle-icon">✨</span>
                    <div>
                      <strong>
                        {selectedSlotIds.length === 0
                          ? "No slots selected yet"
                          : `${selectedSlotIds.length} Slot(s) Selected for ${formattedSelectedDate}`}
                      </strong>
                      <div className="selected-slots-tags-list">
                        {selectedSlotIds.length === 0 ? (
                          <span className="no-selection-hint">
                            Check one or multiple slots in the table above to book them together.
                          </span>
                        ) : (
                          slotsData.slots
                            .filter((s) => selectedSlotIds.includes(s.id))
                            .map((s) => (
                              <span key={s.id} className="selected-slot-tag">
                                🕒 {s.label}
                                <button
                                  type="button"
                                  className="remove-slot-btn"
                                  onClick={() => toggleSlot(s.id)}
                                  title="Remove slot"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedSlotIds.length > 0 && (
                    <div className="summary-total-hours">
                      <span>Total Duration:</span>
                      <strong>{selectedSlotIds.length} Hour{selectedSlotIds.length > 1 ? "s" : ""}</strong>
                    </div>
                  )}
                </div>

                <div className="summary-card-footer">
                  <button
                    type="button"
                    className="reserve-submit-btn"
                    disabled={selectedSlotIds.length === 0 || bookingInProgress}
                    onClick={handleBookSelectedSlots}
                  >
                    {bookingInProgress
                      ? "Booking Reservation..."
                      : selectedSlotIds.length === 0
                      ? "Select Slots from Table to Book"
                      : selectedSlotIds.length === 1
                      ? "Confirm & Book 1 Selected Slot 🚀"
                      : `Confirm & Book All ${selectedSlotIds.length} Selected Slots 🚀`}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="no-slots-notice">No slot information available for this date.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ReservationForm;