// Feature flags for backend services
// Toggle via environment variables
module.exports = {
  pythonServicesEnabled: process.env.ENABLE_PYTHON_SERVICES === 'true'
};