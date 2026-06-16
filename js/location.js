// Reads the device's real location and resolves it to a city name.
// Posting is BLOCKED if permission is denied — no stale-location fallback,
// so the postmark always reflects where you really are.

// Returns { lat, lng } or throws an Error with a friendly message.
function getCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This device can't share its location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission is needed to post a letter. Please allow it and try again."));
        } else {
          reject(new Error("Couldn't read your location. Please try again."));
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  });
}

// Free, no-key reverse geocoding (BigDataCloud). Falls back to coords if it fails.
async function cityFromCoords(lat, lng) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(url);
    const j = await res.json();
    return j.city || j.locality || j.principalSubdivision || j.countryName || "Somewhere";
  } catch {
    return `${lat.toFixed(1)}, ${lng.toFixed(1)}`;
  }
}

// Get location AND save it to the signed-in user's profile (their "last known location").
// Returns { lat, lng, city }.
async function captureAndSaveLocation() {
  const { lat, lng } = await getCoords();
  const city = await cityFromCoords(lat, lng);
  const { data: { user } } = await db.auth.getUser();
  if (user) {
    await db.from("profiles").update({
      lat, lng, city, loc_updated: new Date().toISOString(),
    }).eq("id", user.id);
  }
  return { lat, lng, city };
}
