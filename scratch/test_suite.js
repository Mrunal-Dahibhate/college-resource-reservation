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
    recordTest("Auth", "Valid User Login (/api/login)", loginRes.status === 200 && !!testUserToken, `Token generated for ${loginRes.data?.user?.email}`);

    // Protected Profile with Token
    const profileRes = await api("/api/profile", {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    recordTest("Auth", "Protected Route with Valid JWT (/api/profile)", profileRes.status === 200 && profileRes.data?.user?.email === testUserEmail);

    // Protected Route without Token
    const unauthProfileRes = await api("/api/profile");
    recordTest("Auth", "Protected Route Rejection without Token", unauthProfileRes.status === 401);

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
    // SUITE 4: SLOTS, AVAILABILITY & BOOKING DYNAMICS
    // -------------------------------------------------------------
    console.log("\n--- SUITE 4: SLOTS, AVAILABILITY & BOOKING DYNAMICS ---");
    const testDate = "2026-11-20"; // A clean future date

    // Initial slots check
    const initialSlotsRes = await api(`/api/resources/${targetResourceId}/slots?date=${testDate}`);
    recordTest("Slots", "Fetch Daily Slots (/api/resources/:id/slots)", initialSlotsRes.status === 200 && initialSlotsRes.data?.totalSlots === 10, `Total: ${initialSlotsRes.data?.totalSlots}, Available: ${initialSlotsRes.data?.availableSlots}`);

    // Create reservation for slot 09:00 - 10:00
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
    recordTest("Reservation", "Create Resource Reservation", reserveRes.status === 201 && !!createdReservationId, `Reservation ID: ${createdReservationId}`);

    // Verify slots count updated (booked +1, available -1)
    const updatedSlotsRes = await api(`/api/resources/${targetResourceId}/slots?date=${testDate}`);
    const slot09 = updatedSlotsRes.data?.slots?.find(s => s.startTime === "09:00");
    recordTest("Slots", "Slot State Updated after Booking", updatedSlotsRes.data?.bookedSlots >= 1 && slot09?.isBooked === true, `Slot 09:00-10:00 isBooked: ${slot09?.isBooked}`);

    // Conflict Prevention: Try booking the exact same slot
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

    // My Reservations
    const myRes = await api("/api/my-reservations", {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    const foundMyRes = Array.isArray(myRes.data) && myRes.data.some(r => r.id === createdReservationId);
    recordTest("Reservation", "View User's Reservations (/api/my-reservations)", myRes.status === 200 && foundMyRes, `User has ${myRes.data?.length} reservation(s)`);

    // -------------------------------------------------------------
    // SUITE 5: FULLY-BOOKED DATE & DISABLED DATE ENFORCEMENT
    // -------------------------------------------------------------
    console.log("\n--- SUITE 5: FULLY-BOOKED DATE & DISABLED DATE ENFORCEMENT ---");
    const fullDate = "2026-11-21";

    // Book all remaining 9 slots (and 1st slot) to fill 08:00 to 18:00
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

    // Check availability API for November
    const monthAvailRes = await api(`/api/resources/${targetResourceId}/availability?month=2026-11`);
    const dayData = monthAvailRes.data?.dates?.[fullDate];
    const isFullyBooked = dayData?.isFullyBooked === true && dayData?.availableSlots === 0 && dayData?.bookedSlots === 10;
    recordTest("Availability", "Day marked Fully Booked (0 Available, 10 Booked)", isFullyBooked, `Date ${fullDate}: isFullyBooked=${dayData?.isFullyBooked}, available=${dayData?.availableSlots}`);

    // Check slots API for fully booked date
    const fullDateSlotsRes = await api(`/api/resources/${targetResourceId}/slots?date=${fullDate}`);
    recordTest("Availability", "All Slots Disabled for Fully Booked Day", fullDateSlotsRes.data?.isFullyBooked === true && fullDateSlotsRes.data?.availableSlots === 0, `All ${fullDateSlotsRes.data?.totalSlots} slots booked`);

    // -------------------------------------------------------------
    // SUITE 6: CANCELLATION FLOW
    // -------------------------------------------------------------
    console.log("\n--- SUITE 6: CANCELLATION FLOW ---");
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
    // SUITE 7: ADMIN ROLE SECURITY & OPERATIONS
    // -------------------------------------------------------------
    console.log("\n--- SUITE 7: ADMIN ROLE SECURITY & OPERATIONS ---");
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
    // SUITE 8: ADMIN APPROVAL / REJECTION & NOTIFICATIONS
    // -------------------------------------------------------------
    console.log("\n--- SUITE 8: ADMIN APPROVAL / REJECTION & NOTIFICATIONS ---");
    // Create new reservation to test admin approval
    const resvToApprove = await api("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${testUserToken}` },
      body: JSON.stringify({
        resource_id: targetResourceId,
        start_time: "2026-11-22 10:00:00",
        end_time: "2026-11-22 11:00:00"
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
        start_time: "2026-11-22 11:00:00",
        end_time: "2026-11-22 12:00:00"
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

  } catch (error) {
    console.error("Test Suite Runtime Error:", error);
  } finally {
    // -------------------------------------------------------------
    // TEARDOWN & CLEANUP
    // -------------------------------------------------------------
    console.log("\n--- TEARDOWN & DATABASE CLEANUP ---");
    const db = require("../src/db");
    const cleanupQueries = [];

    if (testUserId) {
      cleanupQueries.push(`DELETE FROM users WHERE id = ${testUserId}`);
    }
    if (createdResourceId) {
      cleanupQueries.push(`DELETE FROM resources WHERE id = ${createdResourceId}`);
    }
    if (fullDayReservationIds.length > 0) {
      cleanupQueries.push(`DELETE FROM reservations WHERE id IN (${fullDayReservationIds.join(",")})`);
    }

    for (const q of cleanupQueries) {
      await new Promise(resolve => db.query(q, () => resolve()));
    }
    console.log("✓ Cleanup completed successfully.");
    db.end();
  }

  // -------------------------------------------------------------
  // TEST SUMMARY
  // -------------------------------------------------------------
  console.log("\n==================================================================");
  console.log("📊 TEST EXECUTION SUMMARY");
  console.log("==================================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Tests Run : ${total}`);
  console.log(`Passed         : ${passed}`);
  console.log(`Failed         : ${failed}`);
  console.log(`Success Rate   : ${Math.round((passed / total) * 100)}%`);

  if (failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The entire project is healthy and verified.");
  } else {
    console.log("\n⚠️ Some tests failed. Please review the output above.");
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite();
