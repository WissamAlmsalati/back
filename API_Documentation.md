# Gym SaaS API Documentation & Postman Guide

## Introduction
This document provides an overview of the Gym SaaS API, common user flows, and details for testing endpoints using Postman.

## Authentication
All protected endpoints require a Bearer token in the `Authorization` header.
Obtain a token by registering and/or logging in.

### 1. Register User
- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "roleName": "MEMBER" // Or GYM_OWNER, INSTRUCTOR, etc.
  }
  ```
- **Response (201 CREATED)**:
  ```json
  {
    "message": "User registered successfully. Please login."
  }
  ```

### 2. Login User
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "your_jwt_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "MEMBER"
    }
  }
  ```
---

## User Flow 1: New Member Registration & First Booking

**Objective**: A new user registers, subscribes to a plan, and books a session.

**Steps**:

### 1. Register as a MEMBER
- Use Authentication/Register endpoint above.
- **Note**: After registration, proceed to login.

### 2. Login as a MEMBER
- Use Authentication/Login endpoint above.
- **Action**: Copy the `token` from the response. In Postman, for subsequent requests, go to the "Authorization" tab, select "Bearer Token", and paste your token.

### 3. View Own Profile (Optional)
- **Method**: `GET`
- **URL**: `/api/users/me`
- **Headers**: `Authorization: Bearer <your_token>`
- **Response (200 OK)**: User object.

### 4. List Available Gyms
- **Method**: `GET`
- **URL**: `/api/gyms`
- **Headers**: `Authorization: Bearer <your_token>`
- **Response (200 OK)**: Array of gym objects. Example:
  ```json
  [ { "id": 1, "name": "Fitness Hub Downtown", "ownerId": 2 } ]
  ```
- **Action**: Note the `id` of the gym you are interested in.

### 5. List Branches for a Selected Gym
- **Method**: `GET`
- **URL**: `/api/gyms/:gymId/branches` (e.g., `/api/gyms/1/branches`)
- **Headers**: `Authorization: Bearer <your_token>`
- **Response (200 OK)**: Array of branch objects.
- **Action**: Note the `id` of the branch.

### 6. List Membership Plans
- **Method**: `GET`
- **URL**: `/api/membership-plans?gymId=<gym_id_from_step_4>`
- **Headers**: `Authorization: Bearer <your_token>`
- **Response (200 OK)**: Array of membership plan objects. Example:
  ```json
  [ { "id": 1, "name": "Gold Monthly", "price": 50.00, "durationDays": 30, "gymId": 1 } ]
  ```
- **Action**: Note the `id` of the plan.

### 7. Subscribe to a Membership Plan
- **Method**: `POST`
- **URL**: `/api/subscriptions`
- **Headers**: `Authorization: Bearer <your_token>`
- **Body**:
  ```json
  {
    "userId": <your_user_id_from_login>,
    "planId": <plan_id_from_step_6>,
    "paymentDetails": { "method": "mock_payment", "transactionId": "temp123" }
  }
  ```
- **Response (201 CREATED)**: Subscription object with `status: "ACTIVE"`.

### 8. List Scheduled Sessions
- **Method**: `GET`
- **URL**: `/api/scheduled-sessions?branchId=<branch_id_from_step_5>&status=UPCOMING`
- **Headers**: `Authorization: Bearer <your_token>`
- **Response (200 OK)**: Array of scheduled session objects. Example:
  ```json
  [ { "id": 1, "branchId": 1, "classTypeId": 1, "instructorUserId": 3, "startTime": "2025-07-01T10:00:00.000Z", "endTime": "2025-07-01T11:00:00.000Z", "maxCapacity": 20, "currentCapacityBooked": 5, "status": "UPCOMING" } ]
  ```
- **Action**: Note the `id` of an available session.

### 9. Book a Session
- **Method**: `POST`
- **URL**: `/api/bookings`
- **Headers**: `Authorization: Bearer <your_token>`
- **Body**:
  ```json
  {
    "sessionId": <session_id_from_step_8>
  }
  ```
- **Response (201 CREATED)**: Booking object with `status: "CONFIRMED"`.

### 10. View My Bookings
- **Method**: `GET`
- **URL**: `/api/users/<your_user_id_from_login>/bookings`
- **Headers**: `Authorization: Bearer <your_token>`
- **Response (200 OK)**: Array of your bookings.

### 11. Cancel a Booking (Optional)
- **Method**: `PUT`
- **URL**: `/api/bookings/<booking_id_from_step_9_or_10>/cancel`
- **Headers**: `Authorization: Bearer <your_token>`
- **Response (200 OK)**: Updated booking object with `status: "CANCELLED_BY_USER"`.

---
## Summary of Other Key User Flows
- **Gym Owner Onboarding**: Register as GYM_OWNER, create Gym, Branches, Membership Plans, Class Types, Equipment, Schedule Sessions.
- **Super Admin Management**: Login, manage users (view, change roles, deactivate), manage all entities.

---
## Endpoint List Summary

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Users (`/api/users`)
- `GET /me`
- `PUT /me`
- `GET /`
- `GET /:userId`
- `PUT /:userId`
- `PUT /:userId/role`
- `DELETE /:userId`
- `GET /:userId/subscriptions`
- `POST /:userId/subscriptions`
- `GET /:userId/bookings`
- `POST /:userId/bookings`

### Gyms (`/api/gyms`)
- `POST /`
- `GET /`
- `GET /:gymId`
- `PUT /:gymId`
- `DELETE /:gymId`
- `GET /:gymId/branches`
- `POST /:gymId/branches`

### Branches (`/api/branches`)
- `GET /:branchId`
- `PUT /:branchId`
- `DELETE /:branchId`
- `GET /:branchId/equipment`
- `POST /:branchId/equipment`

### Membership Plans (`/api/membership-plans`)
- `POST /`
- `GET /`
- `GET /:planId`
- `PUT /:planId`
- `DELETE /:planId`

### Equipment (`/api/equipment`)
- `GET /:equipmentId`
- `PUT /:equipmentId`
- `DELETE /:equipmentId`

### Training Class Types (`/api/class-types`)
- `POST /`
- `GET /`
- `GET /:classTypeId`
- `PUT /:classTypeId`
- `DELETE /:classTypeId`

### Scheduled Sessions (`/api/scheduled-sessions`)
- `POST /`
- `GET /`
- `GET /:sessionId`
- `PUT /:sessionId`
- `DELETE /:sessionId`
  *(Note: Nested booking routes like /api/scheduled-sessions/:sessionId/bookings are planned but not yet linked in scheduledSessionRoutes.js)*

### Member Subscriptions (`/api/subscriptions`)
- `POST /`
- `GET /`
- `GET /:subscriptionId`
- `PUT /:subscriptionId/status`
- `POST /admin/check-expired`

### Bookings (`/api/bookings`)
- `POST /`
- `GET /`
- `GET /:bookingId`
- `PUT /:bookingId/cancel`

---
*This is a starting point. You can expand this with more detailed request/response examples and error codes for each endpoint.*
