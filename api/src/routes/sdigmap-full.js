import express from 'express';


const router = express.Router();

// Cadastre (ktimatologio) parcel service — used to resolve a KAEK to a geometry/centroid.
const CADASTRE_URL =
  'https://services-eu1.arcgis.com/40tFGWzosjaLJpmn/ArcGIS/rest/services/GEOTEMAXIA_LEITOURGOUN_ON_gdb/FeatureServer/0/query';

// SDIGMAP (TEE) ArcGIS mapping services base.
const SDIGMAP_BASE = 'https://sdigmap.tee.gov.gr/mapping/rest/services/UDM';

// Full set of public SDIGMAP "Map layers" (per the Drawing Order), grouped into thematic
// categories. Each entry is queried spatially against the full parcel polygon (falls back
// to the parcel centroid point). No owner / private data is included. Standalone Tables
// (Μηχανικός ΤΕΕ, TEE_ENGINEER_DHM_ENOT_ELSTAT, V_TEE_ENGINEER_DIMOTIKES_ENOTITES_VOL2) hold
// non-spatial TEE-engineer registry records with no KAEK/geometry join available, so they are
// intentionally excluded from this per-property spatial report.
const CATEGORIES = [
  {
    key: 'dioikitika',
    label: 'Γεωτεμαχία Εθνικού Κτηματολογίου',
    service: 'UDM_ENGINEER_DHMOI',
    layers: [{ id: 0, label: 'Δημοτικές Ενότητες 2021' }],
  },
  {
    key: 'poleodomika',
    label: 'Πολεοδομική Πληροφορία',
    service: 'UDM_SERVICE_POLEODOMIKI_PLIROFORIA',
    layers: [
      { id: 25, label: 'Χρήσεις Γης' },
      { id: 26, label: 'Χρήσεις Γης ΓΠΣ' },
      { id: 0, label: 'Ρυμοτομικά Σχέδια - Πολεοδ. Μελέτες' },
      { id: 1, label: 'Γραμμές Αιγιαλού και Παραλίας' },
      { id: 2, label: 'Διατηρητέα Κτίσματα' },
      { id: 3, label: 'Καθορισμένο Όριο Οικισμού' },
      { id: 4, label: 'Κορυφές ΟΤ (εγκεκρ. Πολεοδ. Μελέτη ή Π.Ε.)' },
      { id: 5, label: 'Λοιπές Ζώνες Ρυμοτομικού Σχεδίου' },
      { id: 6, label: 'Οικοδομικά Τετράγωνα' },
      { id: 7, label: 'Οριοθετημένο Ρέμα' },
      { id: 8, label: 'Πεζόδρομος' },
      { id: 9, label: 'Περιοχή Εκτός Σχεδίου' },
      { id: 10, label: 'Πολεοδομικές Γραμμές' },
      { id: 11, label: 'Ρυμοτομική Γραμμή' },
      { id: 12, label: 'Οικοδομική Γραμμή' },
      { id: 13, label: 'Λοιπές Πολεοδομικές Γραμμές' },
      { id: 14, label: 'Πολεοδομική Ενότητα - Γειτονιά - Τομέας' },
      { id: 15, label: 'Πολύγωνα Όρων Δόμησης' },
      { id: 16, label: 'Πολύγωνα Όρων Δόμησης Αριθμός Ορόφων - Ύψος' },
      { id: 17, label: 'Πολύγωνα Όρων Δόμησης Αρτιότητα' },
      { id: 18, label: 'Πολύγωνα Όρων Δόμησης Κάλυψη' },
      { id: 19, label: 'Πολύγωνα Όρων Δόμησης Οικοδομικό Σύστημα' },
      { id: 20, label: 'Συντελεστής Δόμησης' },
      { id: 21, label: 'Χρήσεις Γης ΕΡΣ' },
      { id: 22, label: 'Χώροι Κοινόχρηστων - Κοινωφελών Λειτουργιών' },
      { id: 23, label: 'Ζώνη Αρχαιολογική' },
      { id: 24, label: 'Ζώνη Απαλλοτρίωσης' },
    ],
  },
  {
    key: 'poleod_rym_sxd',
    label: 'Ρυμοτομικά Διαγράμματα και Πολεοδομικά Σχέδια',
    service: 'UDM_SERVICE_POLEOD_RYM_SXD',
    layers: [{ id: 0, label: 'Όριο Πολεοδ. Μελέτης – Εγκεκριμένο Σχέδιο' }],
  },
  {
    key: 'sxedia_docs',
    label: 'Αποφάσεις και Διατάγματα Ρυμοτομικών Σχεδίων, Πολεοδομικών Μελετών και Τροποποιήσεων',
    service: 'UDM_SERVICE_SXEDIA_DOCS',
    layers: [{ id: 0, label: 'Περιγράμματα Διαγραμμάτων' }],
  },
  {
    key: 'fek_no_sxedia',
    label: 'ΦΕΚ Χωρίς Διάγραμμα',
    service: 'UDM_SERVICE_FEK_NO_SXEDIA_DOCS',
    layers: [{ id: 0, label: 'ΦΕΚ Χωρίς Διάγραμμα' }],
  },
  {
    key: 'ypd',
    label: 'Ζώνες Τιμών Αντικειμενικού Προσδιορισμού Αξίας Ακινήτων',
    service: 'UDM_SERVICE_YPD',
    layers: [
      { id: 6, label: 'Οικοδομικά Τετράγωνα' },
      { id: 20, label: 'Συντελεστής Δόμησης' },
      { id: 3, label: 'Καθορισμένο Όριο Οικισμού' },
    ],
  },
  {
    key: 'exoastikos',
    label: 'Ρυθμίσεις Εξωαστικού Χώρου',
    service: 'UDM_SERVICE_RYTHMISEIS_EXOASTIKOU_CHOROU',
    layers: [
      { id: 0, label: 'Ζώνες Οικιστικού Ελέγχου (ΖΟΕ)' },
      { id: 1, label: 'Όρια Ζωνών Οικιστικού Ελέγχου (ΖΟΕ)' },
      { id: 2, label: 'Ζώνες ΠΔ Προστασίας' },
      { id: 3, label: 'Όρια ΠΔ Προστασίας' },
      { id: 4, label: 'Ζώνες Α & Β Εντός Αττικής' },
      { id: 5, label: 'Ρέματα Ιδιαίτερου Περιβαλλοντικού Ενδιαφέροντος' },
    ],
  },
  {
    key: 'arxaiologika',
    label: 'Αρχαιολογικό Κτηματολόγιο',
    service: 'UDM_SERVICE_ARCHAIOLOGIKO',
    layers: [
      { id: 0, label: 'Μνημεία' },
      { id: 1, label: 'Μνημεία - Σημεία' },
      { id: 2, label: 'Μνημεία - Γραμμές' },
      { id: 3, label: 'Μνημεία - Πολύγωνα' },
      { id: 4, label: 'Ζώνες Προστασίας' },
      { id: 5, label: 'Ζώνες Προστασίας - Σημεία' },
      { id: 6, label: 'Ζώνες Προστασίας - Γραμμές' },
      { id: 7, label: 'Ζώνες Προστασίας - Πολύγωνα' },
      { id: 8, label: 'Ιστορικοί Τόποι' },
      { id: 9, label: 'Ιστορικοί Τόποι - Σημεία' },
      { id: 10, label: 'Ιστορικοί Τόποι - Γραμμές' },
      { id: 11, label: 'Ιστορικοί Τόποι - Πολύγωνα' },
      { id: 12, label: 'Αρχαιολογικοί Χώροι' },
      { id: 13, label: 'Αρχαιολογικοί Χώροι - Σημεία' },
      { id: 14, label: 'Αρχαιολογικοί Χώροι - Γραμμές' },
      { id: 15, label: 'Αρχαιολογικοί Χώροι - Πολύγωνα' },
      { id: 16, label: 'Τοπία Φυσικού Κάλλους' },
      { id: 17, label: 'Τοπία Φυσικού Κάλλους - Σημεία' },
      { id: 18, label: 'Τοπία Φυσικού Κάλλους - Πολύγωνα' },
    ],
  },
  {
    key: 'dasika',
    label: 'Natura - Δασικοί Χάρτες',
    service: 'UDM_SERVICE_NATURA_DASIKA',
    layers: [
      { id: 0, label: 'Θεσμοθετημένες Περιοχές Natura 2000 (ενημέρωση 10.06.21)' },
      { id: 1, label: 'Μερικώς κυρωμένοι δασικοί χάρτες (02.06.21)' },
      { id: 2, label: 'Περιφέρεια Αν. Μακεδονίας και Θράκης - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 3, label: 'Περιφέρεια Αττικής - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 4, label: 'Περιφέρεια Βορείου Αιγαίου - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 5, label: 'Περιφέρεια Δυτικής Ελλάδας - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 6, label: 'Περιφέρεια Δυτικής Μακεδονίας - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 7, label: 'Περιφέρεια Ηπείρου - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 8, label: 'Περιφέρεια Θεσσαλίας - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 9, label: 'Περιφέρεια Ιονίων Νήσων - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 10, label: 'Περιφέρεια Κεντρικής Μακεδονίας - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 11, label: 'Περιφέρεια Κρήτης - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 12, label: 'Περιφέρεια Νοτίου Αιγαίου - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 13, label: 'Περιφέρεια Πελοποννήσου - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 14, label: 'Περιφέρεια Στερεάς Ελλάδας - Μερικώς κυρωμένοι δασικοί χάρτες' },
      { id: 15, label: 'Αναρτημένοι δασικοί χάρτες 2022 (18.04.22)' },
      { id: 16, label: 'Περιφέρεια Αν. Μακεδονίας και Θράκης - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 17, label: 'Περιφέρεια Βορείου Αιγαίου - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 18, label: 'Περιφέρεια Δυτικής Ελλάδας - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 19, label: 'Περιφέρεια Δυτικής Μακεδονίας - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 20, label: 'Περιφέρεια Ηπείρου - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 21, label: 'Περιφέρεια Θεσσαλίας - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 22, label: 'Περιφέρεια Ιονίων Νήσων - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 23, label: 'Περιφέρεια Κεντρικής Μακεδονίας - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 24, label: 'Περιφέρεια Κρήτης - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 25, label: 'Περιφέρεια Νοτίου Αιγαίου - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 26, label: 'Περιφέρεια Πελοποννήσου - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 27, label: 'Περιφέρεια Στερεάς Ελλάδας - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 28, label: 'Μεγίστη - Αναρτημένοι δασικοί χάρτες 2022' },
      { id: 29, label: 'Αναρτημένοι δασικοί χάρτες (14.06.21)' },
      { id: 30, label: 'Περιφέρεια Αν. Μακεδονίας και Θράκης - Αναρτημένοι δασικοί χάρτες' },
      { id: 31, label: 'Περιφέρεια Αττικής - Αναρτημένοι δασικοί χάρτες' },
      { id: 32, label: 'Περιφέρεια Βορείου Αιγαίου - Αναρτημένοι δασικοί χάρτες' },
      { id: 33, label: 'Περιφέρεια Δυτικής Ελλάδας - Αναρτημένοι δασικοί χάρτες' },
      { id: 34, label: 'Περιφέρεια Δυτικής Μακεδονίας - Αναρτημένοι δασικοί χάρτες' },
      { id: 35, label: 'Περιφέρεια Ηπείρου - Αναρτημένοι δασικοί χάρτες' },
      { id: 36, label: 'Περιφέρεια Θεσσαλίας - Αναρτημένοι δασικοί χάρτες' },
      { id: 37, label: 'Περιφέρεια Ιονίων Νήσων - Αναρτημένοι δασικοί χάρτες' },
      { id: 38, label: 'Περιφέρεια Κεντρικής Μακεδονίας - Αναρτημένοι δασικοί χάρτες' },
      { id: 39, label: 'Περιφέρεια Κρήτης - Αναρτημένοι δασικοί χάρτες' },
      { id: 40, label: 'Περιφέρεια Νοτίου Αιγαίου - Αναρτημένοι δασικοί χάρτες' },
      { id: 41, label: 'Περιφέρεια Πελοποννήσου - Αναρτημένοι δασικοί χάρτες' },
      { id: 42, label: 'Περιφέρεια Στερεάς Ελλάδας - Αναρτημένοι δασικοί χάρτες' },
    ],
  },
  {
    key: 'elstat',
    label: 'Ελληνική Στατιστική Αρχή (ΕΛΣΤΑΤ)',
    service: 'UDM_SERVICE_ELSTAT',
    layers: [
      { id: 0, label: 'Καλλικρατικοί Δήμοι 2021' },
      { id: 1, label: 'Αποκεντρωμένες Διοικήσεις 2021' },
      { id: 2, label: 'Περιφέρειες 2021' },
      { id: 3, label: 'Περιφερειακές Ενότητες 2021' },
      { id: 5, label: 'Δημοτικές Ενότητες 2021' },
      { id: 6, label: 'Δημοτικές Κοινότητες 2021' },
      { id: 7, label: 'Απογραφικά Οικοδομικά Τετράγωνα 2011' },
      { id: 8, label: 'Απογραφή 2011' },
      { id: 10, label: 'Αποκεντρωμένες Διοικήσεις 2011' },
      { id: 11, label: 'Περιφέρειες 2011' },
      { id: 12, label: 'Περιφερειακές Ενότητες 2011' },
      { id: 13, label: 'Καλλικρατικοί Δήμοι 2011' },
      { id: 14, label: 'Δημοτικές Ενότητες 2011' },
      { id: 15, label: 'Δημοτικές - Τοπικές Κοινότητες 2011' },
      { id: 16, label: 'Οικισμοί 2011 (Θέσεις - ονοματολογία)' },
      { id: 17, label: 'Απογραφή 2021' },
      { id: 18, label: 'Οικισμοί 2021 (Θέσεις - ονοματολογία)' },
      { id: 20, label: 'Απογραφικά Οικοδομικά Τετράγωνα 2021' },
    ],
  },
];

// Fields we never expose (internal ids / geometry helpers).
const HIDDEN_FIELDS = /^(OBJECTID|OBJECTID_1|FID|GLOBALID|SHAPE|SHAPE_|Shape_|Shape__|SE_ANNO|KEY_FLAG|OID|OID_1|MUNUNITS)/i;

// Some SDIGMAP services expose "Group Layer" entries (e.g. POLEODOMIKI layers 0, 10, 15,
// 25) which have no geometry of their own and cannot be queried directly — the ArcGIS
// server replies with "Invalid or missing input parameters." Their sub-layers are already
// listed individually in CATEGORIES, so we just skip group layers. We fetch each service's
// MapServer metadata once (cached) and build a Set of group-layer ids to skip.
const groupLayerCache = new Map(); // service -> Set<number> of group layer ids

async function getGroupLayerIds(service) {
  if (groupLayerCache.has(service)) {
    return groupLayerCache.get(service);
  }
  const ids = new Set();
  try {
    const metaUrl = `${SDIGMAP_BASE}/${service}/MapServer?f=json`;
    const res = await fetch(`${metaUrl}`);
    if (res.ok) {
      const meta = await res.json();
      const layers = meta.layers || [];
      for (const ly of layers) {
        if (ly.type === 'Group Layer' || ly.subLayerIds) {
          ids.add(ly.id);
        }
      }
    }
  } catch (err) {
    // If metadata fetch fails, assume no group layers and let per-layer queries surface
    // their own errors.
    console.warn(`SDIGMAP ${service} metadata fetch issue: ${err.message}`);
  }
  groupLayerCache.set(service, ids);
  return ids;
}

// --- Simple in-memory cache + throttling/retry helpers for the Cadastre lookup ---
// The Cadastre ArcGIS service enforces a strict per-IP rate limit ("Too many requests").
// We cache resolved parcels for a while and serialize + retry outgoing requests to stay
// under that limit.
const PARCEL_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const parcelCache = new Map(); // kaek -> { data, expiresAt }
const FULL_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const fullDataCache = new Map(); // kaek -> { data, expiresAt }

let lastCadastreRequestAt = 0;
const MIN_CADASTRE_INTERVAL_MS = 600; // throttle: min gap between outgoing Cadastre requests
let cadastreQueue = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Adds random jitter (+/- up to 30% of base) to a backoff delay to avoid a thundering
// herd of clients retrying in lockstep against the upstream Cadastre service.
function withJitter(baseMs) {
  const jitter = baseMs * 0.3 * (Math.random() * 2 - 1); // +/-30%
  return Math.max(200, Math.round(baseMs + jitter));
}

// Runs `fn` serialized after previous calls, respecting a minimum spacing between
// outgoing requests, to avoid tripping the upstream rate limiter.
function throttledCadastreCall(fn) {
  const run = cadastreQueue.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, lastCadastreRequestAt + MIN_CADASTRE_INTERVAL_MS - now);
    if (wait > 0) await sleep(wait);
    lastCadastreRequestAt = Date.now();
    return fn();
  });
  // Keep the queue alive even if this call fails, so subsequent calls still run.
  cadastreQueue = run.catch(() => {});
  return run;
}

async function fetchWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isRateLimitMessage(message) {
  return typeof message === 'string' && /too many requests/i.test(message);
}

function centroidOfRing(ring) {
  let sx = 0;
  let sy = 0;
  ring.forEach(([x, y]) => {
    sx += x;
    sy += y;
  });
  const n = ring.length || 1;
  return { longitude: sx / n, latitude: sy / n };
}

// Resolve KAEK -> parcel feature (geometry in WGS84 + attributes). Cached, throttled,
// and retried with exponential backoff to survive the Cadastre service's rate limiting.
async function resolveParcel(kaek) {
  const cached = parcelCache.get(kaek);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const params = new URLSearchParams({
    where: `KAEK = '${kaek}'`,
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'json',
  });
  const url = `${CADASTRE_URL}?${params.toString()}`;

  const maxAttempts = 6;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const data = await throttledCadastreCall(async () => {
        const res = await fetchWithTimeout(url, 20000);
        if (!res.ok) {
          throw new Error(`Cadastre lookup failed: ${res.status} ${res.statusText}`);
        }
        return res.json();
      });

      if (data.error) {
        const message = data.error.message || 'unknown';
        if (isRateLimitMessage(message) && attempt < maxAttempts) {
          const backoff = withJitter(800 * 2 ** (attempt - 1));
          console.warn(`Cadastre rate limited (attempt ${attempt}/${maxAttempts}), retrying in ${backoff}ms`);
          await sleep(backoff);
          continue;
        }
        throw new Error(`Cadastre error: ${message}`);
      }

      const feature = data.features && data.features[0];
      if (!feature || !feature.geometry || !Array.isArray(feature.geometry.rings)) {
        return null;
      }
      const ring = feature.geometry.rings[0];
      const parcel = {
        attributes: feature.attributes || {},
        polygon: ring,
        centroid: centroidOfRing(ring),
      };
      parcelCache.set(kaek, { data: parcel, expiresAt: Date.now() + PARCEL_CACHE_TTL_MS });
      return parcel;
    } catch (err) {
      lastError = err;
      const isTimeoutOrNetwork = err.name === 'AbortError' || err.message?.includes('fetch failed');
      if ((isTimeoutOrNetwork || isRateLimitMessage(err.message)) && attempt < maxAttempts) {
        const backoff = withJitter(800 * 2 ** (attempt - 1));
        console.warn(`Cadastre lookup issue (attempt ${attempt}/${maxAttempts}): ${err.message}. Retrying in ${backoff}ms`);
        await sleep(backoff);
        continue;
      }
      break;
    }
  }

  console.error(`Cadastre lookup exhausted retries for KAEK ${kaek}: ${lastError?.message}`);
  throw new Error(
    'Η υπηρεσία Κτηματολογίου είναι προσωρινά μη διαθέσιμη λόγω μεγάλου φόρτου (πολλά αιτήματα). Δοκιμάστε ξανά σε λίγα δευτερόλεπτα.',
  );
}

// Query one SDIGMAP layer spatially against the full parcel polygon (falls back to the
// parcel centroid point if the polygon query errors). Returns array of attribute objects.
// Group layers (no geometry) are skipped silently — their sub-layers are queried separately.
async function queryLayer(service, layerId, ring, lng, lat) {
  const groupIds = await getGroupLayerIds(service);
  if (groupIds.has(layerId)) {
    return [];
  }

  const url = `${SDIGMAP_BASE}/${service}/MapServer/${layerId}/query`;

  async function runQuery(geometry, geometryType) {
    const params = new URLSearchParams({
      geometry: JSON.stringify(geometry),
      geometryType,
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'false',
      f: 'json',
    });
    const res = await fetch(`${url}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`SDIGMAP ${service}/${layerId} failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  let data;
  if (Array.isArray(ring) && ring.length >= 3) {
    data = await runQuery({ rings: [ring], spatialReference: { wkid: 4326 } }, 'esriGeometryPolygon');
    if (data.error) {
      console.warn(`SDIGMAP ${service}/${layerId} polygon query issue: ${data.error.message}, retrying with point`);
      data = await runQuery({ x: lng, y: lat, spatialReference: { wkid: 4326 } }, 'esriGeometryPoint');
    }
  } else {
    data = await runQuery({ x: lng, y: lat, spatialReference: { wkid: 4326 } }, 'esriGeometryPoint');
  }

  if (data.error) {
    console.warn(`SDIGMAP ${service}/${layerId} query issue: ${data.error.message}`);
    return [];
  }
  return (data.features || []).map((f) => f.attributes || {});
}

// Turn a raw attributes object into ordered {label, value, url?} rows, hiding internal fields.
function toRows(attrs) {
  const rows = [];
  for (const [name, value] of Object.entries(attrs)) {
    if (HIDDEN_FIELDS.test(name)) continue;
    if (value === null || value === undefined || value === '') continue;
    // Detect URL fields (FEK_FILE_URL, GEOREF_DIAGRAM_URL, INITIAL_DIAGRAM_URL, etc.)
    const isUrl = /_URL$/i.test(name) || (typeof value === 'string' && /^https?:\/\//i.test(value));
    rows.push({
      field: name,
      value: String(value),
      url: isUrl ? String(value) : null,
    });
  }
  return rows;
}

async function buildFullData(kaek) {
  const cached = fullDataCache.get(kaek);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const parcel = await resolveParcel(kaek);
  if (!parcel) return null;

  const { longitude: lng, latitude: lat } = parcel.centroid;
  const ring = parcel.polygon;

  const categories = await Promise.all(
    CATEGORIES.map(async (cat) => {
      const layerResults = await Promise.allSettled(
        cat.layers.map(async (ly) => {
          const records = await queryLayer(cat.service, ly.id, ring, lng, lat);
          return { label: ly.label, records };
        }),
      );
      const layers = layerResults
        .filter((r) => r.status === 'fulfilled' && r.value.records.length > 0)
        .map((r) => ({
          label: r.value.label,
          records: r.value.records.map((attrs) => toRows(attrs)).filter((rows) => rows.length > 0),
        }))
        .filter((l) => l.records.length > 0);
      return { key: cat.key, label: cat.label, layers };
    }),
  );

  const a = parcel.attributes;
  const result = {
    kaek,
    parcel: {
      kaek,
      area: a.AREA != null ? Math.round(a.AREA) : null,
      perimeter: a.PERIMETER != null ? Math.round(a.PERIMETER) : null,
      mainUse: a.DESCR || null,
      mainUseCode: a.MAIN_USE || null,
      percentage: a.PERCENTAGE != null ? a.PERCENTAGE : null,
      link: a.LINK || null,
    },
    centroid: parcel.centroid,
    polygon: parcel.polygon,
    categories: categories.filter((c) => c.layers.length > 0),
  };

  fullDataCache.set(kaek, { data: result, expiresAt: Date.now() + FULL_CACHE_TTL_MS });
  return result;
}

// GET /sdigmap-full/:kaek — full public SDIGMAP dataset for a parcel, grouped by category.
router.get('/:kaek', async (req, res) => {
  const kaek = String(req.params.kaek || '').trim();
  if (!kaek || !/^\d+$/.test(kaek)) {
    return res.status(422).json({ success: false, error: 'Απαιτείται έγκυρος αριθμητικός ΚΑΕΚ' });
  }

  console.log(`Full SDIGMAP lookup for KAEK: ${kaek}`);

  const data = await buildFullData(kaek);
  if (!data) {
    return res.status(404).json({ success: false, error: `Δεν βρέθηκε ακίνητο με ΚΑΕΚ ${kaek}` });
  }

  res.json({ success: true, data });
});

export default router;
