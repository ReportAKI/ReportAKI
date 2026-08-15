import express from 'express';


const router = express.Router();

const SDIGMAP_ROOT = 'https://sdigmap.tee.gov.gr/mapping/rest/services';

// Folders known to hold spatial/thematic layers. "Utilities" only holds the
// Geometry helper service, not real map data, so it is skipped.
const INCLUDED_FOLDERS = ['UDM'];

// Fields we never expose (internal ids / geometry helpers).
const HIDDEN_FIELDS = /^(OBJECTID|OBJECTID_1|FID|GLOBALID|SHAPE|SHAPE_|Shape_|Shape__|SE_ANNO|OID|OID_1)/i;

// In-memory cache of the discovered layer catalog (service+layer list rarely
// changes, so we avoid re-discovering it on every single request).
let layerCatalogCache = null;
let layerCatalogCachedAt = 0;
const CATALOG_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`SDIGMAP request failed: ${response.status} ${response.statusText} (${url})`);
  }
  return response.json();
}

// Discover every FeatureServer/MapServer under the included folders, then list
// each service's queryable ("Feature Layer") sub-layers.
async function discoverLayerCatalog() {
  const now = Date.now();
  if (layerCatalogCache && now - layerCatalogCachedAt < CATALOG_TTL_MS) {
    return layerCatalogCache;
  }

  const catalog = [];

  for (const folder of INCLUDED_FOLDERS) {
    const folderData = await fetchJson(`${SDIGMAP_ROOT}/${folder}?f=json`);
    const services = Array.isArray(folderData.services) ? folderData.services : [];

    // Prefer MapServer entries (they expose sub-layers); dedupe by service name.
    const mapServices = services.filter((s) => s.type === 'MapServer');

    for (const service of mapServices) {
      const serviceUrl = `${SDIGMAP_ROOT}/${service.name}/MapServer`;
      let serviceInfo;
      try {
        serviceInfo = await fetchJson(`${serviceUrl}?f=json`);
      } catch (err) {
        console.warn(`SDIGMAP service discovery failed for ${service.name}: ${err.message}`);
        continue;
      }

      const layers = Array.isArray(serviceInfo.layers) ? serviceInfo.layers : [];
      const queryableLayers = layers.filter((l) => l.type === 'Feature Layer');

      for (const layer of queryableLayers) {
        catalog.push({
          service: service.name,
          layerId: layer.id,
          layerName: layer.name?.trim() || `Layer ${layer.id}`,
          url: `${serviceUrl}/${layer.id}`,
        });
      }
    }
  }

  layerCatalogCache = catalog;
  layerCatalogCachedAt = now;
  return catalog;
}

// Turn a raw attributes object into ordered {field, value, url?} rows, hiding internal fields.
function toRows(attrs) {
  const rows = [];
  for (const [name, value] of Object.entries(attrs)) {
    if (HIDDEN_FIELDS.test(name)) continue;
    if (value === null || value === undefined || value === '') continue;
    const isUrl = /_URL$/i.test(name) || (typeof value === 'string' && /^https?:\/\//i.test(value));
    rows.push({
      field: name,
      value: String(value),
      url: isUrl ? String(value) : null,
    });
  }
  return rows;
}

// Spatial point query against a single layer.
async function queryLayerAtPoint(layer, lat, lon) {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'false',
    f: 'json',
  });
  const data = await fetchJson(`${layer.url}/query?${params.toString()}`);
  if (data.error) {
    throw new Error(`SDIGMAP layer query error (${layer.service}/${layer.layerId}): ${data.error.message || 'unknown error'}`);
  }
  return (data.features || []).map((f) => f.attributes || {});
}

// GET /sdigmap-layers?lat=..&lon=.. — auto-discover every SDIGMAP layer, run a spatial
// point query against each with the KAEK coordinates, and return results grouped by layer.
router.get('/', async (req, res) => {
  const { lat, lon } = req.query;
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (!lat || !lon || Number.isNaN(latNum) || Number.isNaN(lonNum)) {
    return res.status(422).json({ success: false, error: 'Απαιτούνται έγκυρες παράμετροι lat και lon' });
  }

  const catalog = await discoverLayerCatalog();

  if (catalog.length === 0) {
    return res.json({ success: true, data: { layers: [] } });
  }

  const results = await Promise.allSettled(
    catalog.map(async (layer) => {
      const attributesList = await queryLayerAtPoint(layer, latNum, lonNum);
      return {
        service: layer.service,
        layerId: layer.layerId,
        title: layer.layerName,
        records: attributesList.map((attrs) => toRows(attrs)).filter((rows) => rows.length > 0),
      };
    }),
  );

  const layers = results.map((r, idx) => {
    if (r.status === 'fulfilled') {
      return r.value;
    }
    console.warn(`SDIGMAP layer query failed for ${catalog[idx].service}/${catalog[idx].layerId}: ${r.reason?.message}`);
    return {
      service: catalog[idx].service,
      layerId: catalog[idx].layerId,
      title: catalog[idx].layerName,
      records: [],
      error: r.reason?.message || 'Άγνωστο σφάλμα',
    };
  });

  res.json({
    success: true,
    data: {
      layers,
      totalLayersScanned: catalog.length,
    },
  });
});

export default router;
