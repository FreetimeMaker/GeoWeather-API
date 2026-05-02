const crypto = require('crypto');

const generateUUID = () => crypto.randomUUID();

const paginate = (page = 1, limit = 20) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  return { offset, limit: limitNum, page: pageNum };
};

const formatResponse = (message, data = null, status = 'success') => {
  return {
    status,
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString(),
  };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Haversine formula
  const R = 6371; // Erdradius in Kilometern
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
};

const getNearbyLocations = (favorites, userLat, userLon, radiusKm = 50) => {
  return favorites
    .map((fav) => ({
      ...fav,
      distance: calculateDistance(userLat, userLon, fav.latitude, fav.longitude),
    }))
    .filter((fav) => fav.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
};

module.exports = {
  generateUUID,
  paginate,
  formatResponse,
  calculateDistance,
  getNearbyLocations,
};
