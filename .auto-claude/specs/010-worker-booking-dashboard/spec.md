# Worker Booking Dashboard

Worker dashboard showing all bookings with status (pending, accepted, completed, cancelled), job details, and business information. Includes cancel functionality for pending bookings and attendance tracking view.

## Rationale
Workers need to track their upcoming jobs and manage their schedule. A clear dashboard reduces no-shows by keeping workers informed and organized.

## User Stories
- As a worker, I want to see my upcoming jobs so that I can plan my week
- As a worker, I want to see which applications were accepted so that I know when to show up
- As a worker, I want to cancel bookings if something comes up so that I don't no-show

## Acceptance Criteria
- [x] Workers see all their bookings in one place
- [x] Booking status is clearly displayed
- [x] Job details include position, date, time, location, and wage
- [x] Business information shows company name and verification status
- [x] Pending bookings can be cancelled

## Out of Scope (Future Work)

The following features are NOT included in this implementation and will be addressed in separate tickets:

1. **Attendance Tracking UI** - "Completed bookings show attendance record"
   - This requires a separate feature: worker attendance management system
   - Would include: punch-in/out records, attendance status, hours worked display
   - To be implemented as: "Worker Attendance Tracking" feature

2. **Real-time Notifications** - "Notifications alert workers to status changes"
   - This requires a separate feature: notification system with Supabase realtime
   - Would include: toast notifications, push notifications, status change alerts
   - To be implemented as: "Worker Notifications System" feature
