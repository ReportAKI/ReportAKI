import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

const ExportPage = () => {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('id');
  const [format, setFormat] = useState('pdf');
  const [sections, setSections] = useState({
    basicInfo: true,
    urbanPlanning: true,
    geospatial: true,
    legal: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

  useEffect(() => {
    if (!propertyId) {
      toast.error('Δεν βρέθηκε αναγνωριστικό ακινήτου');
    }
  }, [propertyId]);

  const handleSectionToggle = (section) => {
    setSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleGenerate = async () => {
    if (!propertyId) {
      toast.error('Δεν βρέθηκε αναγνωριστικό ακινήτου');
      return;
    }

    const selectedSections = Object.keys(sections).filter((key) => sections[key]);
    if (selectedSections.length === 0) {
      toast.error('Επιλέξτε τουλάχιστον μία ενότητα');
      return;
    }

    setIsGenerating(true);
    setDownloadUrl(null);

    try {
      const response = await apiServerClient.fetch('/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          format,
          sections: selectedSections,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Αποτυχία δημιουργίας αναφοράς');
      }

      const data = await response.json();
      setDownloadUrl(data.downloadUrl);
      toast.success('Η αναφορά δημιουργήθηκε επιτυχώς');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Σφάλμα κατά τη δημιουργία αναφοράς');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Εξαγωγή Αναφοράς - ReportAKI</title>
        <meta name="description" content="Εξαγωγή πολεοδομικής αναφοράς σε PDF ή Excel" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />

        <section className="py-12 flex-1">
          <div className="container-custom max-w-4xl">
            <div className="mb-8">
              <Link to={`/property/${propertyId}`}>
                <Button variant="outline" className="gap-2 mb-4 border-border text-foreground hover:bg-muted">
                  <ArrowLeft className="w-4 h-4" />
                  Επιστροφή στο Ακίνητο
                </Button>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">Εξαγωγή Αναφοράς</h1>
              <p className="text-muted-foreground">
                Επιλέξτε μορφή και ενότητες για την αναφορά σας
              </p>
            </div>

            <div className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Μορφή Αρχείου</CardTitle>
                  <CardDescription className="text-muted-foreground">Επιλέξτε τη μορφή εξαγωγής της αναφοράς</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={format} onValueChange={setFormat} className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors duration-200">
                      <RadioGroupItem value="pdf" id="pdf" className="mt-1 border-foreground text-foreground" />
                      <div className="flex-1">
                        <Label htmlFor="pdf" className="cursor-pointer flex items-center gap-2 font-medium text-foreground">
                          <FileText className="w-5 h-5 text-foreground" />
                          PDF Report
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Επαγγελματική αναφορά με όλα τα δεδομένα σε μορφή PDF
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors duration-200">
                      <RadioGroupItem value="excel" id="excel" className="mt-1 border-foreground text-foreground" />
                      <div className="flex-1">
                        <Label htmlFor="excel" className="cursor-pointer flex items-center gap-2 font-medium text-foreground">
                          <FileSpreadsheet className="w-5 h-5 text-foreground" />
                          Excel File
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Δομημένα δεδομένα σε μορφή Excel για περαιτέρω επεξεργασία
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Ενότητες Δεδομένων</CardTitle>
                  <CardDescription className="text-muted-foreground">Επιλέξτε ποιες ενότητες θα συμπεριληφθούν</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 border border-border rounded-lg">
                    <Checkbox
                      id="basicInfo"
                      checked={sections.basicInfo}
                      onCheckedChange={() => handleSectionToggle('basicInfo')}
                      className="border-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <div className="flex-1">
                      <Label htmlFor="basicInfo" className="cursor-pointer font-medium text-foreground">
                        Βασικές Πληροφορίες
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Διεύθυνση, ΚΑΕΚ, συντεταγμένες
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border border-border rounded-lg">
                    <Checkbox
                      id="urbanPlanning"
                      checked={sections.urbanPlanning}
                      onCheckedChange={() => handleSectionToggle('urbanPlanning')}
                      className="border-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <div className="flex-1">
                      <Label htmlFor="urbanPlanning" className="cursor-pointer font-medium text-foreground">
                        Πολεοδομικά Δεδομένα
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ζώνη, τύπος κτιρίου, εμβαδόν, όροφοι
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border border-border rounded-lg">
                    <Checkbox
                      id="geospatial"
                      checked={sections.geospatial}
                      onCheckedChange={() => handleSectionToggle('geospatial')}
                      className="border-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <div className="flex-1">
                      <Label htmlFor="geospatial" className="cursor-pointer font-medium text-foreground">
                        Γεωχωρικά Δεδομένα
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Συντεταγμένες, τοποθεσία, όρια
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border border-border rounded-lg">
                    <Checkbox
                      id="legal"
                      checked={sections.legal}
                      onCheckedChange={() => handleSectionToggle('legal')}
                      className="border-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <div className="flex-1">
                      <Label htmlFor="legal" className="cursor-pointer font-medium text-foreground">
                        Νομικά Δεδομένα
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ιδιοκτησία, περιορισμοί, υποθήκες
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between gap-4">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !propertyId}
                  size="lg"
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="w-5 h-5" />
                  {isGenerating ? 'Δημιουργία...' : 'Δημιουργία Αναφοράς'}
                </Button>
              </div>

              {downloadUrl && (
                <Card className="border-border bg-muted/30">
                  <CardContent className="py-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center flex-shrink-0 border border-border">
                        <CheckCircle2 className="w-6 h-6 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2 text-foreground">Η αναφορά είναι έτοιμη</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Η αναφορά σας δημιουργήθηκε επιτυχώς και είναι έτοιμη για λήψη
                        </p>
                        <a href={downloadUrl} download>
                          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                            <Download className="w-4 h-4" />
                            Λήψη Αναφοράς
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default ExportPage;