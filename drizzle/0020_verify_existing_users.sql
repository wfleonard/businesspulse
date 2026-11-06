-- Sign-in now requires a confirmed email. Every login before self sign-up was
-- created by an admin (seed script or approved access request), so mark them
-- confirmed rather than lock anyone out.
UPDATE "user" SET "email_verified" = true WHERE "email_verified" = false;
