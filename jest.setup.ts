import '@testing-library/jest-dom'

// Ensure a valid 32-byte key exists for crypto tests even if .env.local changes.
if (!process.env.CONNECTOR_ENC_KEY) {
  process.env.CONNECTOR_ENC_KEY = 'XQwFnw+V0S6PPtpQCreyYdV6efgkmnGooicz31tbEnY='
}
