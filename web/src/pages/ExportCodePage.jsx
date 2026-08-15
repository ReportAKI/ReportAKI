import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Download, ArrowLeft, Loader2 } from 'lucide-react';
import { API_SERVER_URL } from '@/lib/apiServerClient';
import Footer from '@/components/Footer.jsx';

// ============================================================================
// ΔΙΑΓΡΑΨΙΜΗ ΣΕΛΙΔΑ — Export ολόκληρου του κώδικα σε ZIP
// Αφαιρέστε αυτή τη σελίδα, τη διαδρομή στο App.jsx και το route
// /export-code στο backend για να καταργήσετε τη λειτουργία.
// ============================================================================

const ExportCodePage = () => {
  const [downloading, setDownloading] = useState(false);

  const handleExport = () => {
    setDownloading(true);
    // Άμεσο download του ZIP από το backend
    const url = API_SERVER_URL + '/export-code';
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reportaki-source.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Επαναφορά μετά από λίγο (το download ξεκινά αμέσως)
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <>
      <Helmet>
        <title>Export Κώδικα — ReportAKI</title>
        <meta name="description" content="Λήψη όλου του πηγαίου κώδικα της εφαρμογής ReportAKI σε αρχείο ZIP" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-white text-black">
        <main className="flex-1 flex flex-col items-center w-full justify-center px-4 py-20">
          <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-black/60 hover:text-black mb-10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Επιστροφή στην αρχική
            </Link>

            <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-6">
              <Download className="w-8 h-8 text-black" strokeWidth={1.5} />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Export Πηγαίου Κώδικα
            </h1>

            <p className="text-sm md:text-base text-black/70 leading-relaxed max-w-md mb-10">
              Λήψη όλου του κώδικα της εφαρμογής (φάκελος <span className="font-mono text-black">apps/</span>,
              <span className="font-mono text-black"> package.json</span> και
              <span className="font-mono text-black"> package-lock.json</span>) σε ένα αρχείο ZIP.
            </p>

            <button
              onClick={handleExport}
              disabled={downloading}
              className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white rounded-lg font-medium text-base hover:bg-black/85 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Προετοιμασία...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Λήψη ZIP
                </>
              )}
            </button>

            <p className="text-xs text-black/40 mt-8">
              Το αρχείο περιλαμβάνει μόνο τον πηγαίο κώδικα (χωρίς node_modules).
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default ExportCodePage;
