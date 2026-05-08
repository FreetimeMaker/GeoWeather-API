const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;

  return true;
};

const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  if (start >= end) return false;

  return true;
};

const validateTemperature = (temp) => {
  const temperature = parseFloat(temp);
  if (isNaN(temperature)) return false;
  // Realistische Temperaturspanne (-90 bis 60°C)
  if (temperature < -90 || temperature > 60) return false;

  return true;
};

const validateHumidity = (humidity) => {
  const h = parseFloat(humidity);
  if (isNaN(h) || h < 0 || h > 100) return false;

  return true;
};

const validatePressure = (pressure) => {
  const p = parseFloat(pressure);
  if (isNaN(p) || p < 800 || p > 1100) return false;

  return true;
};

module.exports = {
  validateEmail,
  validateCoordinates,
  validateDateRange,
  validateTemperature,
  validateHumidity,
  validatePressure,
};
