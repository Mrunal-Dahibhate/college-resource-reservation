const http = require("http");

const BASE_URL = "http://localhost:5001";
const FRONTEND_URL = "http://localhost:5173";

// Helper for HTTP requests using Node built-in fetch
async function api(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const contentType = res.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

// Results logger
const results = [];
function recordTest(suite, name, passed, details = "") {
  results.push({ suite, name, passed, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon} [${suite}] ${name}${details ? ` -> ${details}` : ""}`);
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("🚀 STARTING FULL COMPREHENSIVE PROJECT TEST SUITE");
  console.log("==================================================================\n");

  let testUserId = null;
  let testUserToken = null;
  let testUserEmail = `test_${Date.now()}@college.edu`;
  let adminToken = null;
  let createdResourceId = null;
  let createdReservationId = null;
  let fullDayReservationIds = [];

  try {
    // -------------------------------------------------------------
    // SUITE 1: SERVER & DATABASE HEALTH
    // -------------------------------------------------------------
    console.log("\n--- SUITE 1: SERVER & DATABASE HEALTH ---");
    const rootRes = await api("/");
    recordTest("Server", "Root API Endpoint Health", rootRes.status === 200 && rootRes.data.includes("College Resource Reservation API"));

    const frontendRes = await api(FRONTEND_URL);
    recordTest("Frontend", "Frontend Dev Server Health (Vite)", frontendRes.status === 200 && frontendRes.data.includes("<html"));

    // -------------------------------------------------------------
    // SUITE 2: AUTHENTICATION & ACCESS CONTROL
    // -------------------------------------------------------------
    console.log("\n--- SUITE 2: AUTHENTICATION & ACCESS CONTROL ---");
    // Register
    const regRes = await api("/api/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Runner User",
        email: testUserEmail,
        password: "TestPassword@123"
      })
    });
    testUserId = regRes.data?.userId;
    recordTest("Auth", "User Registration (/api/register)", regRes.status === 201, `User ID: ${testUserId}`);

    // Registration duplicate check
    const dupRes = await api("/api/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Duplicate User",
        email: testUserEmail,
        password: "TestPassword@123"
      })
    });
    recordTest("Auth", "Duplicate Email Registration Rejection", dupRes.status === 400);

    // Invalid Login
    const badLoginRes = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: testUserEmail,
        password: "WrongPassword"
      })
    });
    recordTest("Auth", "Invalid Credentials Rejection", badLoginRes.status === 401);

    // Valid Login
    const loginRes = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: testUserEmail,
        password: "TestPassword@123"
      })
    });
    testUserToken = loginRes.data?.token;
    recordTest("Auth", "User Login (/api/login)", loginRes.status === 200 && !!testUserToken, `Token Length: ${testUserToken?.length}`);

    // Protected route check without token
    const unauthRes = await api("/api/my-reservations");
    recordTest("Auth", "Protected Route Rejects Unauthenticated Request", unauthRes.status === 401);

    // Protected route check with invalid token
    const badTokenRes = await api("/api/my-reservations", {
      headers: { Authorization: "Bearer invalid.token.payload" }
    });
    recordTest("Auth", "Protected Route Rejects Invalid JWT Token", badTokenRes.status === 403);

    // -------------------------------------------------------------
    // SUITE 3: RESOURCE LISTING & METADATA
    // -------------------------------------------------------------
    console.log("\n--- SUITE 3: RESOURCE LISTING & METADATA ---");
    const resourcesRes = await api("/api/resources");
    const hasResources = Array.isArray(resourcesRes.data) && resourcesRes.data.length > 0;
    recordTest("Resources", "Fetch Available College Resources (/api/resources)", resourcesRes.status === 200 && hasResources, `Found ${resourcesRes.data?.length} resources`);

    const primaryResource = resourcesRes.data.find(r => r.status === "available") || resourcesRes.data[0];
    const targetResourceId = primaryResource.id;

    // -------------------------------------------------------------
    // SUITE 4: 8 AM TO 6 PM SLOTS & 15-DAY ADVANCE BOOKING RULES
    // -------------------------------------------------------------
    console.log("\n--- SUITE 4: 8 AM TO 6 PM SLOTS & 15-DAY ADVANCE BOOKING RULES ---");
    
    // Dynamic future dates within 15 days window
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const dTest = new Date(now);
    dTest.setDate(dTest.getDate() + 2);
    const testDate = fmt(dTest);

    const dFull = new Date(now);
    dFull.setDate(dFull.getDate() + 4);
    const fullDate = fmt(dFull);

    const dNext = new Date(now);
    dNext.setDate(dNext.getDate() + 5);
    const multiSlotDate = fmt(dNext);

    const dBeyond = new Date(now);
    dBeyond.setDate(dBeyond.getDate() + 20);
    const beyond15DaysDate = fmt(dBeyond);

    // 4.1 Slots check: 10 one-hour slots between 8 AM and 6 PM
    const initialSlotsRes = await api(`/api/resources/${targetResourceId}/slots?date=${testDate}`);
    const totalSlotsIs10 = initialSlotsRes.status === 200 && initialSlotsRes.data?.totalSlots === 10;
    const firstSlot = initialSlotsRes.data?.slots?.[0];
    const lastSlot = initialSlotsRes.data?.slots?.[initialSlotsRes.data?.slots?.length - 1];
    const hoursCorrect = firstSlot?.startTime === "08:00" && lastSlot?.endTime === "18:00";
    recordTest("Slots", "Daily Slots are 8:00 AM to 6:00 PM (10 One-Hour Slots)", totalSlotsIs10 && hoursCorrect, `Slots: ${initialSlotsRes.data?.totalSlots}, First: ${firstSlot?.label}, Last: ${lastSlot?.label}`);

    // 4.2 Enforce 15-day advance booking limit: booking 20 days ahead MUST be rejected
    const beyondAdvanceRes = await api("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: JSON.stringify({
        resource_id: targetResourceId,
        start_time: `${beyond15DaysDate} 09:00:00`,
        end_time: `${beyond15DaysDate} 10:00:00`
      })
    });
    recordTest("Advance Booking", "Reject Booking Beyond 15-Day Advance Window", beyondAdvanceRes.status === 400 && beyondAdvanceRes.data?.error?.includes("15 days"), `Status: ${beyondAdvanceRes.status}, Error: ${beyondAdvanceRes.data?.error}`);

    // 4.3 Enforce operating hours: booking before 8 AM or after 6 PM MUST be rejected
    const badHoursRes = await api("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: JSON.stringify({
        resource_id: targetResourceId,
        start_time: `${testDate} 06:00:00`,
        end_time: `${testDate} 07:00:00`
      })
    });
    recordTest("Operating Hours", "Reject Booking Outside Operating Hours (8 AM - 6 PM)", badHoursRes.status === 400, `Status: ${badHoursRes.status}, Error: ${badHoursRes.data?.error}`);

    // 4.4 Create single 1-hour reservation within 15-day window (09:00 - 10:00)
    const startDateTime = `${testDate} 09:00:00`;
    const endDateTime = `${testDate} 10:00:00`;
    const reserveRes = await api("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: JSON.stringify({
        resource_id: targetResourceId,
        start_time: startDateTime,
        end_time: endDateTime
      })
    });
    createdReservationId = reserveRes.data?.reservationId;
    recordTest("Reservation", "Create Single 1-Hour Reservation within 15 Days", reserveRes.status === 201 && !!createdReservationId, `Reservation ID: ${createdReservationId}`);

    // Verify slots count updated (booked +1, available -1)
    const updatedSlotsRes = await api(`/api/resources/${targetResourceId}/slots?date=${testDate}`);
    const slot09 = updatedSlotsRes.data?.slots?.find(s => s.startTime === "09:00");
    recordTest("Slots", "Slot Availability Updated (Shows Slots Remaining)", updatedSlotsRes.data?.bookedSlots >= 1 && slot09?.isBooked === true, `Slot 09:00-10:00 isBooked: ${slot09?.isBooked}, Remaining: ${updatedSlotsRes.data?.availableSlots}`);

    // 4.5 Conflict Prevention: Try booking the exact same slot
    const conflictRes = await api("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: JSON.stringify({
        resource_id: targetResourceId,
        start_time: startDateTime,
        end_time: endDateTime
      })
    });
    recordTest("Reservation", "Prevent Overlapping Conflict Reservation", conflictRes.status === 409, `Conflict Error: ${conflictRes.data?.error}`);

    // 4.6 MULTI-SLOT BOOKING: Book multiple slots of a date in a single request
    console.log("\n--- SUITE 5: MULTI-SLOT BOOKING ON A DATE ---");
    const multiSlotRes = await api("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: JSON.stringify({
        resource_id: targetResourceId,
        slots: [
          { start_time: `${multiSlotDate} 10:00:00`, end_time: `${multiSlotDate} 11:00:00` },
          { start_time: `${multiSlotDate} 14:00:00`, end_time: `${multiSlotDate} 15:00:00` }
        ]
      })
    });
    const multiSlotSuccess = multiSlotRes.status === 201 && multiSlotRes.data?.bookedCount === 2;
    recordTest("Multi-Slot", "User Can Book Multiple Slots of a Date Simultaneously", multiSlotSuccess, `Booked Count: ${multiSlotRes.data?.bookedCount}, Message: ${multiSlotRes.data?.message}`);

    // Verify both slots are booked in slots API
    const checkMultiSlots = await api(`/api/resources/${targetResourceId}/slots?date=${multiSlotDate}`);
    const slot10 = checkMultiSlots.data?.slots?.find(s => s.startTime === "10:00");
    const slot14 = checkMultiSlots.data?.slots?.find(s => s.startTime === "14:00");
    recordTest("Multi-Slot", "Verify Both Booked Slots Marked as Booked in Table Data", slot10?.isBooked === true && slot14?.isBooked === true, `Slot 10-11: ${slot10?.isBooked}, Slot 14-15: ${slot14?.isBooked}, Remaining: ${checkMultiSlots.data?.availableSlots}/10`);

    // My Reservations contains user bookings
    const myRes = await api("/api/my-reservations", {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    const foundMyRes = Array.isArray(myRes.data) && myRes.data.some(r => r.id === createdReservationId);
    recordTest("Reservation", "View User's Reservations (/api/my-reservations)", myRes.status === 200 && foundMyRes, `User has ${myRes.data?.length} reservation(s)`);

    // -------------------------------------------------------------
    // SUITE 6: FULLY-BOOKED DATE ENFORCEMENT
    // -------------------------------------------------------------
    console.log("\n--- SUITE 6: FULLY-BOOKED DATE ENFORCEMENT ---");
    // Book all remaining 10 slots of fullDate (08:00 to 18:00)
    const fullDayRes = await api("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: JSON.stringify({
        resource_id: targetResourceId,
        start_time: `${fullDate} 08:00:00`,
        end_time: `${fullDate} 18:00:00`
      })
    });
    if (fullDayRes.data?.reservationId) {
      fullDayReservationIds.push(fullDayRes.data.reservationId);
    }

    // Check availability API for this month
    const currentMonthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const monthAvailRes = await api(`/api/resources/${targetResourceId}/availability?month=${currentMonthKey}`);
    const dayData = monthAvailRes.data?.dates?.[fullDate];
    const isFullyBooked = dayData?.isFullyBooked === true && dayData?.availableSlots === 0 && dayData?.bookedSlots === 10;
    recordTest("Availability", "Day marked Fully Booked (0 Available, 10 Booked)", isFullyBooked, `Date ${fullDate}: isFullyBooked=${dayData?.isFullyBooked}, available=${dayData?.availableSlots}`);

    // Check slots API for fully booked date
    const fullDateSlotsRes = await api(`/api/resources/${targetResourceId}/slots?date=${fullDate}`);
    recordTest("Availability", "All Slots Disabled for Fully Booked Day", fullDateSlotsRes.data?.isFullyBooked === true && fullDateSlotsRes.data?.availableSlots === 0, `All ${fullDateSlotsRes.data?.totalSlots} slots booked`);

    // -------------------------------------------------------------
    // SUITE 7: CANCELLATION FLOW
    // -------------------------------------------------------------
    console.log("\n--- SUITE 7: CANCELLATION FLOW ---");
    const cancelRes = await api(`/api/reservations/${createdReservationId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    recordTest("Reservation", "Cancel Reservation within 2 Hours", cancelRes.status === 200, cancelRes.data?.message);

    // Verify slot freed up
    const freedSlotsRes = await api(`/api/resources/${targetResourceId}/slots?date=${testDate}`);
    const freedSlot = freedSlotsRes.data?.slots?.find(s => s.startTime === "09:00");
    recordTest("Slots", "Slot Freed Up after Cancellation", freedSlot?.isBooked === false, "Slot 09:00-10:00 isBooked: false");

    // -------------------------------------------------------------
    // SUITE 8: ADMIN ROLE SECURITY & OPERATIONS
    // -------------------------------------------------------------
    console.log("\n--- SUITE 8: ADMIN ROLE SECURITY & OPERATIONS ---");
    // Regular student accessing admin routes -> MUST BE 403
    const forbiddenUsers = await api("/api/admin/users", {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    recordTest("Security", "Regular User Blocked from Admin Endpoints", forbiddenUsers.status === 403);

    // Admin login
    const adminLoginRes = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@college.edu",
        password: "Admin@123"
      })
    });
    adminToken = adminLoginRes.data?.token;
    recordTest("Admin", "Admin Login (/api/login)", adminLoginRes.status === 200 && adminLoginRes.data?.user?.role === "admin");

    // Admin Users List
    const adminUsersRes = await api("/api/admin/users", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest("Admin", "Admin View Users List (/api/admin/users)", adminUsersRes.status === 200 && Array.isArray(adminUsersRes.data));

    // Admin Create Resource
    const newResourceRes = await api("/api/admin/resources", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: "Test Lab 101",
        type: "Laboratory",
        capacity: 40,
        location: "Science Wing 1st Floor",
        facilities: "High-end PCs, Projector, Fiber Internet"
      })
    });
    recordTest("Admin", "Admin Create Resource (/api/admin/resources)", newResourceRes.status === 201 || newResourceRes.status === 200);

    // Fetch resources to get the new resource ID
    const allAdminRes = await api("/api/admin/resources", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const createdRes = allAdminRes.data?.find(r => r.name === "Test Lab 101");
    createdResourceId = createdRes?.id;

    // Admin Update Resource
    if (createdResourceId) {
      const updateRes = await api(`/api/admin/resources/${createdResourceId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: "Test Lab 101 - Updated",
          type: "Laboratory",
          capacity: 50,
          location: "Science Wing 1st Floor",
          facilities: "Upgraded PCs, Projector",
          status: "available"
        })
      });
      recordTest("Admin", "Admin Update Resource Details", updateRes.status === 200);

      // Admin Deactivate Resource
      const deactivateRes = await api(`/api/admin/resources/${createdResourceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      recordTest("Admin", "Admin Deactivate Resource", deactivateRes.status === 200);
    }

    // -------------------------------------------------------------
    // SUITE 9: ADMIN APPROVAL / REJECTION & NOTIFICATIONS
    // -------------------------------------------------------------
    console.log("\n--- SUITE 9: ADMIN APPROVAL / REJECTION & NOTIFICATIONS ---");
    const dApprove = new Date(now);
    dApprove.setDate(dApprove.getDate() + 6);
    const approveDate = fmt(dApprove);

    // Create new reservation to test admin approval
    const resvToApprove = await api("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: JSON.stringify({
        resource_id: targetResourceId,
        start_time: `${approveDate} 10:00:00`,
        end_time: `${approveDate} 11:00:00`
      })
    });
    const approveId = resvToApprove.data?.reservationId;

    // Admin approves it
    const approveRes = await api(`/api/admin/reservations/${approveId}/approve`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest("Admin", "Admin Approve Reservation", approveRes.status === 200);

    // User checks notifications
    const userNotifRes = await api("/api/notifications", {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    const hasApprovedNotif = Array.isArray(userNotifRes.data) && userNotifRes.data.some(n => n.message.includes("APPROVED"));
    recordTest("Notifications", "User Receives APPROVED Notification", hasApprovedNotif);

    // Create another reservation to test rejection
    const resvToReject = await api("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: JSON.stringify({
        resource_id: targetResourceId,
        start_time: `${approveDate} 11:00:00`,
        end_time: `${approveDate} 12:00:00`
      })
    });
    const rejectId = resvToReject.data?.reservationId;

    // Admin rejects it
    const rejectRes = await api(`/api/admin/reservations/${rejectId}/reject`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    recordTest("Admin", "Admin Reject Reservation", rejectRes.status === 200);

    // User checks notifications for rejection
    const userNotifRes2 = await api("/api/notifications", {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    const hasRejectedNotif = Array.isArray(userNotifRes2.data) && userNotifRes2.data.some(n => n.message.includes("REJECTED"));
    recordTest("Notifications", "User Receives REJECTED Notification", hasRejectedNotif);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log("\n==================================================================");
    console.log("🏁 TEST SUITE COMPLETED");
    console.log("==================================================================");
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`TOTAL TESTS: ${totalCount}`);
    console.log(`PASSED: ${passedCount}`);
    console.log(`FAILED: ${totalCount - passedCount}`);

    if (passedCount === totalCount) {
      console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 100% HEALTHY");
      process.exit(0);
    } else {
      console.log("\n⚠️ SOME TESTS FAILED. Please review output above.");
      process.exit(1);
    }

  } catch (err) {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
  }
}

runTestSuite();
