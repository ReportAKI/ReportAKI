import express from 'express';


const router = express.Router();

const NOMINATIM_API_BASE = 'https://nominatim.openstreetmap.org/reverse';

// GET /reverse-geocode - Reverse geocode coordinates to address
router.get('/reverse-geocode', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query parameters are required' });
  }

  // Validate that lat and lon are valid numbers
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'lat and lon must be valid numbers' });
  }

  console.log(`Reverse geocoding coordinates: lat=${latitude}, lon=${longitude}`);

  const params = new URLSearchParams({
    format: 'json',
    lat: latitude.toString(),
    lon: longitude.toString(),
    zoom: '18',
    addressdetails: '1',
  });

  const response = await fetch(`${NOMINATIM_API_BASE}?${params.toString()}`, {
    headers: {
      'User-Agent': 'ReportAKI/1.0 (property lookup service)',
      'Accept-Language': 'el,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Nominatim API error: ${data.error}`);
  }

  const addressObj = data.address || {};
  const road = addressObj.road || '';
  const houseNumber = addressObj.house_number || '';
  const suburb = addressObj.suburb || addressObj.neighbourhood || '';
  const city = addressObj.city || addressObj.town || addressObj.village || addressObj.municipality || '';
  const postcode = addressObj.postcode || '';
  const municipality = addressObj.municipality || '';
  const county = addressObj.county || addressObj.state || '';
  const region = addressObj.state || addressObj.region || '';

  // Format address string fully, like Google Maps: 'Οδός [road] [house_number], [postcode] [city/suburb]'
  const streetLine = [road ? `Οδός ${road}` : '', houseNumber].filter(Boolean).join(' ');
  const localityParts = [suburb, city].filter((v, i, arr) => v && arr.indexOf(v) === i);
  const localityLine = [postcode, localityParts.join(', ')].filter(Boolean).join(' ');
  const formattedAddress = [streetLine, localityLine].filter(Boolean).join(', ') || data.display_name || '';

  // Precise postal-style format requested: "Οδός [Όνομα], Αριθμός [Αριθμός], ΤΚ [ΤΚ], [Περιοχή]"
  const area = suburb || city || municipality || '';
  const fullAddressParts = [
    road ? `Οδός ${road}` : '',
    houseNumber ? `Αριθμός ${houseNumber}` : '',
    postcode ? `ΤΚ ${postcode}` : '',
    area,
  ].filter(Boolean);
  const fullAddress = fullAddressParts.length > 0 ? fullAddressParts.join(', ') : (data.display_name || '');

  // Structured list fields requested by the UI:
  // 1. Οδός + Αριθμός (fallback "Πλησιέστερος αριθμός" when no exact house number)
  const streetAndNumber = [
    road || '',
    houseNumber ? houseNumber : (road ? 'Πλησιέστερος αριθμός' : ''),
  ].filter(Boolean).join(' ');

  // 3. Δήμος (ΟΤΑ)
  const otaMunicipality = municipality || city || suburb || '';

  // 4. Περιφερειακή Ενότητα / Νομός
  const regionalUnit = county || region || '';

  res.json({
    address: formattedAddress,
    fullAddress,
    road,
    houseNumber,
    city: city || suburb,
    area,
    postcode,
    municipality,
    county,
    region,
    structuredAddress: {
      streetAndNumber: streetAndNumber || 'Μη διαθέσιμο',
      postcode: postcode || 'Μη διαθέσιμο',
      municipality: otaMunicipality || 'Μη διαθέσιμο',
      regionalUnit: regionalUnit || 'Μη διαθέσιμο',
    },
  });
});

export default router;
