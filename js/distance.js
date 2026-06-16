// Distance → delivery date. Deterministic: your real travel supplies the variation.

// Great-circle distance between two coordinates, in kilometres.
function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Whole number of days a letter spends in transit.
function deliveryDays(km) {
  if (km < 100)  return 2;   // same city / metro
  if (km < 1500) return 4;   // same country / region
  if (km < 5000) return 7;   // continental
  return 12;                 // intercontinental
}

// Given sender & recipient {lat,lng}, return the delivery Date.
function deliverAt(senderLoc, recipientLoc) {
  const km = distanceKm(senderLoc, recipientLoc);
  const days = deliveryDays(km);
  return new Date(Date.now() + days * 86400000);
}
