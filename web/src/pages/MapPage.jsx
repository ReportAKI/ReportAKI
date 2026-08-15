
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import { ArrowLeft, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSearch } from '@/contexts/SearchContext.jsx';
import { 
  parsePolygonString, 
  validateGeometry, 
  isEGSA87, 
  egsa87ToWGS84 
} from '@/lib/coordinateUtils.js';

// Fix for default Leaflet icons in Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapPage = () => {
  const { searchResults } = useSearch();
  const navigate = useNavigate();
  const [mapCenter, setMapCenter] = useState([37.9838, 23.7275]);
  const [mapZoom, setMapZoom] = useState(13);

  let errorCount = 0;
  const mapItems = searchResults.map(property => {
    let validPoly = null;
    let markerPos = null;

    if (property.polygon) {
      const parsed = parsePolygonString(property.polygon);
      const validated = validateGeometry(parsed);
      if (validated) {
        validPoly = validated.map(pt => [pt[1], pt[0]]);
      }
    }

    if (property.coordinates) {
      const parts = String(property.coordinates).split(',').map(c => parseFloat(c.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        let c1 = parts[0];
        let c2 = parts[1];
        if (isEGSA87([c1, c2])) {
          const wgs = egsa87ToWGS84(c1, c2);
          markerPos = [wgs[1], wgs[0]];
        } else {
          markerPos = [c1, c2];
        }
      }
    }

    if (!validPoly && !markerPos) errorCount++;

    return { ...property, validPoly, markerPos };
  });
  const hasErrors = errorCount > 0;

  // Handle map center and user feedback on load
  useEffect(() => {
    if (searchResults.length === 0) {
      navigate('/');
      return;
    }

    if (hasErrors) {
      toast.error('Δεν ήταν δυνατή η φόρτωση του πολυγώνου για ορισμένα ακίνητα.', {
        description: 'Η προβολή στο χάρτη ενδέχεται να μην είναι διαθέσιμη.',
      });
    }

    // Set center based on first valid item
    const firstValid = mapItems.find(i => i.validPoly || i.markerPos);
    if (firstValid) {
      if (firstValid.validPoly) {
        setMapCenter(firstValid.validPoly[0]);
        setMapZoom(16);
      } else if (firstValid.markerPos) {
        setMapCenter(firstValid.markerPos);
        setMapZoom(15);
      }
    }
  }, [searchResults, mapItems, hasErrors, navigate]);

  return (
    <>
      <Helmet>
        <title>Χάρτης Ακινήτων - ReportAKI</title>
        <meta name="description" content="Προβολή ακινήτων σε διαδραστικό χάρτη" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />

        <section className="py-8 flex-1 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">Χάρτης Ακινήτων</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  Προβολή {searchResults.length} {searchResults.length === 1 ? 'ακινήτου' : 'ακινήτων'} στον χάρτη
                </p>
              </div>
              <Link to="/">
                <Button variant="outline" className="gap-2 border-border text-foreground hover:bg-muted w-full sm:w-auto">
                  <ArrowLeft className="w-4 h-4" />
                  Επιστροφή στα Αποτελέσματα
                </Button>
              </Link>
            </div>

            <Card className="overflow-hidden bg-card border-border shadow-sm flex-1 mb-8">
              <CardContent className="p-0 h-[60vh] min-h-[500px] w-full relative z-0">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {mapItems.map((property) => {
                    const hasValidGeo = property.validPoly || property.markerPos;
                    if (!hasValidGeo) return null;

                    const PopupContent = () => (
                      <div className="p-1 min-w-[220px]">
                        <div className="flex items-start gap-2 mb-3">
                          <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-sm mb-1 text-foreground">
                              {property.address || 'Άγνωστη Διεύθυνση'}
                            </h3>
                            {property.kaek && (
                              <p className="text-xs text-muted-foreground bg-muted inline-block px-1.5 py-0.5 rounded">
                                KAEK: {property.kaek}
                              </p>
                            )}
                          </div>
                        </div>
                        {property.coordinates && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 bg-muted/50 p-2 rounded-md">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{property.coordinates}</span>
                          </div>
                        )}
                        <Link to={`/property/${property.id}`}>
                          <Button size="sm" className="w-full">
                            Προβολή Λεπτομερειών
                          </Button>
                        </Link>
                      </div>
                    );

                    return (
                      <React.Fragment key={property.id}>
                        {/* Render Polygon if available */}
                        {property.validPoly && (
                          <Polygon 
                            positions={property.validPoly} 
                            pathOptions={{ 
                              color: 'hsl(var(--primary))', 
                              weight: 2, 
                              fillColor: 'hsl(var(--primary))', 
                              fillOpacity: 0.2 
                            }}
                          >
                            <Popup><PopupContent /></Popup>
                          </Polygon>
                        )}
                        
                        {/* Render fallback Marker if no Polygon OR for point-based properties */}
                        {(!property.validPoly && property.markerPos) && (
                          <Marker position={property.markerPos}>
                            <Popup><PopupContent /></Popup>
                          </Marker>
                        )}
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
              </CardContent>
            </Card>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default MapPage;
