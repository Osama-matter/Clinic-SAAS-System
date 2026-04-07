/*
Run this once on the published database if old doctors are missing because
their TenantId was saved as NULL or 00000000-0000-0000-0000-000000000000.

1. Set @TenantId to the tenant that should own these records.
2. Run the SELECT queries first and review the rows.
3. Uncomment the UPDATE statements and execute them.
*/

DECLARE @TenantId UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000000';

SELECT Id, Name, TenantId, UserId
FROM Doctors
WHERE TenantId IS NULL OR TenantId = '00000000-0000-0000-0000-000000000000';

SELECT Id, Email, TenantId, DoctorId
FROM Users
WHERE Role = 4
  AND (TenantId IS NULL OR TenantId = '00000000-0000-0000-0000-000000000000');

SELECT Id, DoctorId, TenantId
FROM Schedules
WHERE TenantId IS NULL OR TenantId = '00000000-0000-0000-0000-000000000000';

SELECT Id, DoctorId, TenantId
FROM Appointments
WHERE TenantId IS NULL OR TenantId = '00000000-0000-0000-0000-000000000000';

-- UPDATE Doctors
-- SET TenantId = @TenantId
-- WHERE TenantId IS NULL OR TenantId = '00000000-0000-0000-0000-000000000000';

-- UPDATE Users
-- SET TenantId = @TenantId
-- WHERE Role = 4
--   AND (TenantId IS NULL OR TenantId = '00000000-0000-0000-0000-000000000000');

-- UPDATE Schedules
-- SET TenantId = @TenantId
-- WHERE TenantId IS NULL OR TenantId = '00000000-0000-0000-0000-000000000000';

-- UPDATE Appointments
-- SET TenantId = @TenantId
-- WHERE TenantId IS NULL OR TenantId = '00000000-0000-0000-0000-000000000000';
