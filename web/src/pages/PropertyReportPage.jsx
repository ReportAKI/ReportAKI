import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Maximize, Ruler, Loader2, Layers as LayersIcon, Map as MapIcon, Database, AlertTriangle, RefreshCw, ExternalLink, MapPin, Home, Filter, ChevronDown, Check, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { buildExportModel, exportToExcel, exportToPdf } from '@/lib/propertyExport';
import html2canvas from 'html2canvas';
import { renderPropertyMapImage } from '@/lib/mapImage';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuItem, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';
import Footer from '@/components/Footer.jsx';
const MapUpdater = ({
  bounds
}) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [50, 50]
      });
    }
  }, [bounds, map]);
  return null;
};
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function getPolygonArea(coords) {
  if (!coords || coords.length < 3) return 0;
  const lat0 = coords[0][0];
  const mPerLat = 111320;
  const mPerLon = 111320 * Math.cos(lat0 * Math.PI / 180);
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const x1 = coords[i][1] * mPerLon;
    const y1 = coords[i][0] * mPerLat;
    const x2 = coords[j][1] * mPerLon;
    const y2 = coords[j][0] * mPerLat;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}
function getPolygonPerimeter(coords) {
  if (!coords || coords.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    perimeter += getDistance(coords[i][0], coords[i][1], coords[j][0], coords[j][1]);
  }
  return perimeter;
}
function toLeafletCoords(polygon) {
  if (!polygon || !Array.isArray(polygon)) return [];
  const ring = Array.isArray(polygon[0]) && Array.isArray(polygon[0][0]) ? polygon[0] : polygon;
  return ring.map(coord => [coord[1], coord[0]]);
}
const FIELD_LABELS = {
  FEK: 'ΦΕΚ',
  FEK_FILE_URL: 'Αρχείο ΦΕΚ',
  PUBL_DATE: 'Ημ. Δημοσίευσης',
  SIGN_DATE: 'Ημ. Υπογραφής',
  APOF_EIDOS: 'Είδος Απόφασης',
  TITLE: 'Τίτλος',
  NUMBER_: 'Αριθμός',
  MAX_HEIGHT_M: 'Μέγιστο Ύψος (μ.)',
  OROR_MAX_HEIGHT_COMMENT: 'Σχόλιο Ύψους',
  NUM_OROFON: 'Αριθμός Ορόφων',
  OROR_NUM_OROFON_COMMENT: 'Σχόλιο Ορόφων',
  SYNTHIKI_TXT: 'Συνθήκη',
  SD_TIMH: 'Συντελεστής Δόμησης',
  SD_TOMEAS: 'Τομέας',
  SD_KLIMAKOTOS: 'Κλιμακωτός',
  SD_COMMENT: 'Σχόλιο',
  EID_XRHSH_TXT: 'Είδος Χρήσης',
  EID_XRHSH: 'Είδος Χρήσης',
  GEN_XRHSH: 'Γενική Χρήση',
  OT_NUM: 'Αριθμός Ο.Τ.',
  NAME: 'Ονομασία',
  KALL_DHM_NAME: 'Καλλικρατικός Δήμος',
  NAME_GR: 'Ονομασία',
  CODE: 'Κωδικός',
  OTA: 'ΟΤΑ',
  NOMOS: 'Νομός',
  FOREAS: 'Φορέας',
  KATHGORDX: 'Κατηγορία (ΔΧ)',
  KATHGORAL1: 'Κατηγορία (ΑΛ1)',
  KATHGORAL2: 'Κατηγορία (ΑΛ2)',
  SITECODE: 'Κωδικός Περιοχής',
  SITETYPE: 'Τύπος Περιοχής',
  SITE_NAME_: 'Ονομασία Περιοχής',
  GEOREF_DIAGRAM_URL: 'Γεωαναφερμένο Διάγραμμα',
  INITIAL_DIAGRAM_URL: 'Αρχικό Διάγραμμα',
  ZON_PROST_TYPE: 'Τύπος Ζώνης Προστασίας',
  PER_ZOE_TITLE: 'Τίτλος ΖΟΕ',
  OD: 'Ο.Δ.'
};
const PropertyReportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    id
  } = useParams();
  const [propertyData, setPropertyData] = useState(location.state?.propertyData || null);
  const [isLoading, setIsLoading] = useState(!location.state?.propertyData);
  const [sdigmap, setSdigmap] = useState(null);
  const [sdigmapLoading, setSdigmapLoading] = useState(false);
  const [sdigmapError, setSdigmapError] = useState(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(null);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  const [geoData, setGeoData] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const mapWrapperRef = useRef(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState({});
  const [includeMapInExport, setIncludeMapInExport] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const kaek = propertyData?.kaek || id;
  const leafletPolygonCoords = toLeafletCoords(propertyData?.polygon);
  const area = getPolygonArea(leafletPolygonCoords);
  const perimeter = getPolygonPerimeter(leafletPolygonCoords);
  const coords = propertyData?.coordinates;
  const selectedCategory = sdigmap ? sdigmap.categories.find(cat => cat.key === selectedCategoryKey) || null : null;
  const selectedLayer = selectedCategory ? selectedCategory.layers[selectedLayerIndex] || selectedCategory.layers[0] || null : null;
  const selectedExportCount = Object.values(selectedCategoryKeys).filter(Boolean).length;
  async function fetchByKaek(kaekCode) {
    setIsLoading(true);
    try {
      const response = await apiServerClient.fetch(`/arcgis/search?kaek=${encodeURIComponent(kaekCode)}`);
      const result = await response.json();
      if (response.ok && result.success && result.data) {
        setPropertyData(result.data);
      } else {
        toast.error(result.error || 'Δεν βρέθηκαν δεδομένα για το ΚΑΕΚ.');
      }
    } catch (err) {
      console.error('ArcGIS fetch error:', err);
      toast.error('Σφάλμα κατά τη φόρτωση δεδομένων ArcGIS.');
    } finally {
      setIsLoading(false);
    }
  }
  async function fetchSdigmapFull(code) {
    if (!code) return;
    setSdigmapLoading(true);
    setSdigmapError(null);
    try {
      const response = await apiServerClient.fetch(`/sdigmap-full/${encodeURIComponent(code)}`);
      const result = await response.json();
      if (response.ok && result.success && result.data) {
        setSdigmap(result.data);
      } else {
        const msg = (typeof result.error === 'string' ? result.error : null) || (response.status >= 500 ? 'Η υπηρεσία SDIGMAP είναι προσωρινά μη διαθέσιμη λόγω μεγάλου φόρτου. Δοκιμάστε ξανά σε λίγο.' : 'Δεν βρέθηκαν δεδομένα SDIGMAP για αυτό το ΚΑΕΚ.');
        setSdigmapError(msg);
        setSdigmap(null);
      }
    } catch (err) {
      console.error('SDIGMAP fetch error:', err);
      setSdigmapError(err.message || 'Αποτυχία σύνδεσης με την υπηρεσία SDIGMAP.');
      setSdigmap(null);
    } finally {
      setSdigmapLoading(false);
    }
  }
  async function fetchGeoAddress(lat, lon) {
    if (lat == null || lon == null) return;
    setGeoLoading(true);
    setGeoError(false);
    try {
      const response = await apiServerClient.fetch(`/reverse-geocode?lat=${lat}&lon=${lon}`);
      if (!response.ok) throw new Error('Reverse geocode failed');
      const data = await response.json();
      if (data.fullAddress || data.municipality || data.county) {
        setGeoData(data);
      } else {
        setGeoError(true);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
      setGeoError(true);
    } finally {
      setGeoLoading(false);
    }
  }
  async function fetchSummary() {
    if (!kaek) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await apiServerClient.fetch('/property-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kaek,
          area,
          perimeter,
          coords,
          geoData,
          sdigmap
        })
      });
      const result = await response.json();
      if (response.ok && result.summary) {
        setSummary(result.summary);
      } else {
        throw new Error(result.error || 'Αποτυχία δημιουργίας σύνοψης.');
      }
    } catch (err) {
      console.error('Summary fetch error:', err);
      setSummary('');
      setSummaryError('Δεν ήταν δυνατή η δημιουργία της σύνοψης αυτή τη στιγμή.');
    } finally {
      setSummaryLoading(false);
    }
  }
  function toggleExportCategory(key) {
    setSelectedCategoryKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }
  function toggleAllExportCategories(value) {
    const updated = {};
    (sdigmap?.categories || []).forEach(cat => {
      updated[cat.key] = value;
    });
    setSelectedCategoryKeys(updated);
  }
  async function captureMapImage() {
    // Render the map ourselves so the polygon is always centered/zoomed on the property.
    const drawn = await renderPropertyMapImage(leafletPolygonCoords);
    if (drawn) return drawn;
    if (!mapWrapperRef.current) return null;
    try {
      const canvas = await html2canvas(mapWrapperRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#e5e5e5',
        scale: 2
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Map capture error:', err);
      return null;
    }
  }
  async function runExport(format) {
    setIsExporting(true);
    try {
      let mapImageDataUrl = null;
      if (includeMapInExport) {
        mapImageDataUrl = await captureMapImage();
        if (!mapImageDataUrl) toast.error('Δεν ήταν δυνατή η λήψη εικόνας του χάρτη.');
      }
      const selectedKeys = Object.keys(selectedCategoryKeys).filter(k => selectedCategoryKeys[k]);
      const model = buildExportModel({
        kaek,
        geoData,
        area,
        perimeter,
        coords,
        sdigmap,
        fieldLabels: FIELD_LABELS,
        selectedCategoryKeys: selectedKeys,
        mapImageDataUrl
      });
      if (format === 'pdf') {
        const ok = exportToPdf(model);
        if (!ok) {
          toast.error('Επιτρέψτε τα αναδυόμενα παράθυρα για την εξαγωγή PDF.');
        } else {
          setExportDialogOpen(false);
        }
      } else {
        await exportToExcel(model);
        toast.success('Το αρχείο Excel δημιουργήθηκε.');
        setExportDialogOpen(false);
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Σφάλμα κατά την εξαγωγή δεδομένων.');
    } finally {
      setIsExporting(false);
    }
  }
  useEffect(() => {
    if (!location.state?.propertyData && id) {
      fetchByKaek(id);
    }
  }, [id]);
  useEffect(() => {
    if (kaek) fetchSdigmapFull(kaek);
  }, [kaek]);
  useEffect(() => {
    if (sdigmap && sdigmap.categories.length > 0) {
      setSelectedCategoryKey(sdigmap.categories[0].key);
      setSelectedLayerIndex(0);
    } else {
      setSelectedCategoryKey(null);
      setSelectedLayerIndex(0);
    }
  }, [sdigmap]);
  useEffect(() => {
    const lat = coords?.latitude ?? leafletPolygonCoords[0]?.[0];
    const lon = coords?.longitude ?? leafletPolygonCoords[0]?.[1];
    if (lat != null && lon != null) {
      fetchGeoAddress(lat, lon);
    }
  }, [propertyData]);
  useEffect(() => {
    if (!kaek || sdigmapLoading) return;
    fetchSummary();
  }, [kaek, sdigmapLoading]);
  useEffect(() => {
    if (sdigmap?.categories?.length) {
      const initial = {};
      sdigmap.categories.forEach(cat => {
        initial[cat.key] = true;
      });
      setSelectedCategoryKeys(initial);
    } else {
      setSelectedCategoryKeys({});
    }
  }, [sdigmap]);
  if (isLoading) {
    return <div className="min-h-screen w-full bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-gray-700" />
          <p className="text-gray-600 font-medium">Ανάκτηση δεδομένων ArcGIS DATA_ATTIKHS...</p>
        </div>
        <Footer />
      </div>;
  }
  return <>
      <Helmet>
        <title>{`Αναφορά ${kaek || ''} - ReportAKI`}</title>
      </Helmet>

      <div className="min-h-screen w-full bg-background flex flex-col font-sans">
        <header className="w-full px-6 py-4 md:px-8 md:py-5 border-b border-border bg-white flex items-center justify-between shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-4 md:gap-5">
            <button onClick={() => navigate('/')} className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Επιστροφή στην αρχική σελίδα" title="Επιστροφή στην αρχική σελίδα">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400"></span>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-none">
                  {kaek}
                </h1>
              </div>
              <div className="flex items-center gap-1.5 min-h-[20px]">
                {geoLoading ? <span className="text-xs text-gray-400 animate-pulse">Εντοπισμός διεύθυνσης...</span> : geoError ? <span className="text-xs text-gray-400">Διεύθυνση μη διαθέσιμη</span> : geoData ? <span className="text-xs md:text-sm text-gray-600 font-medium whitespace-normal break-words">
                    {[geoData.structuredAddress?.municipality || '', geoData.structuredAddress?.regionalUnit || ''].filter(Boolean).join(', ')}
                  </span> : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-5">
            <button disabled={isLoading} onClick={() => setExportDialogOpen(true)} className="inline-flex items-center gap-2 bg-gray-900 text-white font-semibold text-sm rounded-full px-4 py-2.5 md:px-5 hover:bg-gray-800 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:pointer-events-none" aria-label="Εξαγωγή δεδομένων">
              <Download className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Εξαγωγή</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-10 lg:py-12 flex flex-col gap-10 md:gap-12">

          <section className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-4 md:gap-5 text-center">
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                {area > 0 && <span className="inline-flex items-center gap-2 text-sm md:text-[15px] font-semibold text-gray-700 bg-gray-100 rounded-full px-4 py-2 border border-gray-200">
                    <Maximize className="w-4 h-4 text-gray-500 shrink-0" />
                    {area.toFixed(4)} τ.μ.
                  </span>}
                {perimeter > 0 && <span className="inline-flex items-center gap-2 text-sm md:text-[15px] font-semibold text-gray-700 bg-gray-100 rounded-full px-4 py-2 border border-gray-200">
                    <Ruler className="w-4 h-4 text-gray-500 shrink-0" />
                    {perimeter.toFixed(4)} μ.
                  </span>}
                {coords && <span className="inline-flex items-center gap-2 text-sm md:text-[15px] font-semibold text-gray-700 bg-gray-100 rounded-full px-4 py-2 border border-gray-200">
                    <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
                    {typeof coords === 'string' ? coords : `${Number(coords.latitude).toFixed(6)}, ${Number(coords.longitude).toFixed(6)}`}
                  </span>}
              </div>
            </div>

            <div ref={mapWrapperRef} className="map-container-full">
              {leafletPolygonCoords.length > 0 ? <MapContainer bounds={leafletPolygonCoords} style={{
              height: '100%',
              width: '100%'
            }} scrollWheelZoom={true} attributionControl={true}>
                  <MapUpdater bounds={leafletPolygonCoords} />
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Polygon positions={leafletPolygonCoords} pathOptions={{
                color: '#000000',
                weight: 3,
                fillColor: '#333333',
                fillOpacity: 0.35
              }} />
                </MapContainer> : <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-100">
                  <AlertTriangle className="w-8 h-8 text-gray-400" />
                  <p className="text-sm text-gray-500 font-medium">Δεν υπάρχουν διαθέσιμα γεωγραφικά δεδομένα για αυτό το ακίνητο.</p>
                </div>}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-gray-500 shrink-0" />
                <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Δεδομένα&nbsp; Ακινήτου</h2>
              </div>

              {sdigmap && sdigmap.categories.length > 0 && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-full px-4 py-2.5 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-[0.98]">
                      <Filter className="w-3.5 h-3.5 text-gray-500" />
                      {selectedCategory ? selectedCategory.label : 'Επιλογή κατηγορίας'}
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-w-xs w-72 shadow-xl rounded-2xl border border-gray-100 p-1.5 bg-white" sideOffset={6}>
                    {sdigmap.categories.map(cat => {
                  if (cat.layers.length === 1) {
                    return <DropdownMenuItem key={cat.key} onSelect={() => {
                      setSelectedCategoryKey(cat.key);
                      setSelectedLayerIndex(0);
                    }} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-colors ${selectedCategoryKey === cat.key ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}>
                            <span>{cat.label}</span>
                            {selectedCategoryKey === cat.key && <Check className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                          </DropdownMenuItem>;
                  }
                  return <DropdownMenuSub key={cat.key}>
                          <DropdownMenuSubTrigger className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-colors w-full ${selectedCategoryKey === cat.key ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}>
                            <span>{cat.label}</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="max-w-xs w-64 shadow-xl rounded-2xl border border-gray-100 p-1.5 bg-white" sideOffset={4}>
                              {cat.layers.map((layer, li) => <DropdownMenuItem key={li} onSelect={() => {
                          setSelectedCategoryKey(cat.key);
                          setSelectedLayerIndex(li);
                        }} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors ${selectedCategoryKey === cat.key && selectedLayerIndex === li ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50 font-medium'}`}>
                                  <span>{layer.label}</span>
                                  {selectedCategoryKey === cat.key && selectedLayerIndex === li && <Check className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
                                </DropdownMenuItem>)}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>;
                })}
                  </DropdownMenuContent>
                </DropdownMenu>}
            </div>

            {sdigmapLoading ? <div className="flex items-center justify-center p-10 md:p-14">
                <Loader2 className="w-7 h-7 animate-spin text-gray-500" />
              </div> : sdigmapError ? <div className="flex flex-col items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-5 md:p-6">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                  <p className="text-sm font-semibold text-red-700">Σφάλμα φόρτωσης SDIGMAP</p>
                </div>
                <p className="text-sm text-red-600 leading-relaxed">{sdigmapError}</p>
                <button onClick={() => fetchSdigmapFull(kaek)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700 underline hover:no-underline mt-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Δοκιμάστε ξανά
                </button>
              </div> : sdigmap && sdigmap.categories.length > 0 ? <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {selectedLayer ? <div>
                    <div className="flex items-center gap-3 px-5 md:px-6 py-4 border-b border-gray-100 bg-gray-50">
                      <LayersIcon className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="text-sm font-semibold text-gray-800">{selectedLayer.label}</span>
                      <span className="ml-auto text-xs font-medium text-gray-400 bg-white border border-gray-200 rounded-full px-2.5 py-0.5">
                        {selectedLayer.records.length} {selectedLayer.records.length === 1 ? 'εγγραφή' : 'εγγραφές'}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {selectedLayer.records.map((rows, ri) => <div key={ri} className="p-5 md:p-6 grid sm:grid-cols-2 gap-x-10 gap-y-5 bg-white">
                          {rows.map((row, fi) => <div key={fi} className="pb-3 border-b border-gray-100 sm:border-0 sm:pb-0 last:border-0">
                              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{FIELD_LABELS[row.field] || row.field}</p>
                              {row.url ? <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline break-all inline-flex items-center gap-1.5">
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Άνοιγμα εγγράφου
                                </a> : <p className="text-[15px] font-medium text-gray-900 break-words leading-relaxed">{row.value}</p>}
                            </div>)}
                        </div>)}
                    </div>
                  </div> : <p className="text-gray-500 bg-gray-50 p-6 rounded-2xl border border-gray-100 text-[15px] leading-relaxed">
                    Επιλέξτε μια κατηγορία από το φίλτρο για να δείτε τα δεδομένα.
                  </p>}
              </div> : <p className="text-gray-600 bg-gray-50 p-6 rounded-2xl border border-gray-100 text-[15px] leading-relaxed">
                Δεν βρέθηκαν πολεοδομικά / γεωχωρικά δεδομένα SDIGMAP που να τέμνουν αυτό το ακίνητο.
              </p>}
          </section>

          {summaryLoading ? <div className="flex items-center justify-center p-6 md:p-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div> : summary ? <section className="bg-[#f6f5f2] border-l-4 border-gray-900 rounded-r-2xl p-6 md:p-8 lg:p-10 shadow-sm">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 tracking-tight">Σύνοψη Αναφοράς</h2>
              <p className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
            </section> : summaryError ? <section className="bg-[#f6f5f2] border-l-4 border-gray-900 rounded-r-2xl p-6 md:p-8 lg:p-10 shadow-sm">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 tracking-tight">Σύνοψη Αναφοράς</h2>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-500">{summaryError}</p>
                <button onClick={fetchSummary} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 underline hover:no-underline">
                  <RefreshCw className="w-3.5 h-3.5" /> Δοκιμάστε ξανά
                </button>
              </div>
            </section> : null}

        </main>

        <Footer />
      </div>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Εξαγωγή δεδομένων ακινήτου</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Επιλέξτε τι θα συμπεριληφθεί στο αρχείο εξαγωγής και πατήστε την επιθυμητή μορφή.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 -mr-1">
            <label htmlFor="export-include-map" className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-sm font-medium text-gray-800 flex items-center gap-2.5">
                <MapIcon className="w-4 h-4 text-gray-500 shrink-0" /> Συμπερίληψη χάρτη (ως εικόνα)
              </span>
              <Checkbox id="export-include-map" checked={includeMapInExport} onCheckedChange={v => setIncludeMapInExport(!!v)} />
            </label>

            {sdigmap && sdigmap.categories.length > 0 ? <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Κατηγορίες δεδομένων ({selectedExportCount}/{sdigmap.categories.length})
                  </span>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => toggleAllExportCategories(true)} className="text-xs font-semibold text-blue-600 hover:underline">Όλες</button>
                    <button type="button" onClick={() => toggleAllExportCategories(false)} className="text-xs font-semibold text-gray-500 hover:underline">Καμία</button>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 max-h-[32vh] overflow-y-auto">
                  {sdigmap.categories.map(cat => <label key={cat.key} htmlFor={`export-cat-${cat.key}`} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                      <Checkbox id={`export-cat-${cat.key}`} checked={!!selectedCategoryKeys[cat.key]} onCheckedChange={() => toggleExportCategory(cat.key)} />
                      <span className="text-sm text-gray-800">{cat.label}</span>
                    </label>)}
                </div>
              </div> : <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                Δεν υπάρχουν διαθέσιμες κατηγορίες δεδομένων SDIGMAP για εξαγωγή.
              </p>}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2.5 sm:gap-3 mt-2">
            <button onClick={() => runExport('pdf')} disabled={isExporting} className="inline-flex items-center justify-center gap-2 flex-1 bg-red-600 text-white font-semibold text-sm rounded-full px-5 py-3 hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Εξαγωγή PDF
            </button>
            <button onClick={() => runExport('excel')} disabled={isExporting} className="inline-flex items-center justify-center gap-2 flex-1 bg-green-600 text-white font-semibold text-sm rounded-full px-5 py-3 hover:bg-green-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Εξαγωγή Excel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>;
};
export default PropertyReportPage;