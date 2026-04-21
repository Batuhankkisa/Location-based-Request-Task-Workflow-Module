export function getJwtSecret() {
  return process.env.JWT_SECRET || 'change-me-for-production';
}

export function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '1d';
}
