// ============================================================================
// ΔΙΑΓΡΑΨΙΜΟ ΑΡΧΕΙΟ — Export ολόκληρου του κώδικα σε ZIP
// Αφαιρέστε αυτό το αρχείο, τη γραμμή στο routes/index.js και τη σελίδα
// ExportCodePage.jsx για να καταργήσετε τη λειτουργία.
// ============================================================================
import path from 'node:path';
import { ZipArchive } from 'archiver';

// Φάκελος εργασίας (workspace root) — 4 επίπεδα πάνω από το routes/
const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../../../..');

// Φάκελοι/αρχεία που δεν χρειάζεται να μπουν στο ZIP
// (σχετικά ως προς τη ρίζα του workspace)
const IGNORE_PATTERNS = [
    'apps/**/node_modules/**',
    'apps/**/dist/**',
    'apps/**/build/**',
    'apps/**/.cache/**',
    'apps/**/.vite/**',
    'apps/**/.git/**',
    'apps/**/pb_data/**',
    // το εκτελέσιμο pocketbase (δυαδικό, όχι πηγαίος κώδικας)
    'apps/pocketbase/pocketbase',
    'apps/**/*.log',
];

export default async (req, res) => {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
        'Content-Disposition',
        'attachment; filename="reportaki-source.zip"',
    );

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err) => {
        throw err;
    });
    archive.pipe(res);

    // 1) Όλος ο φάκελος apps/ (χωρίς node_modules, binary, pb_data κλπ.)
    archive.glob('apps/**/*', {
        cwd: WORKSPACE_ROOT,
        ignore: IGNORE_PATTERNS,
        dot: true,
    });

    // 2) package.json & package-lock.json στη ρίζα
    archive.file(path.join(WORKSPACE_ROOT, 'package.json'), { name: 'package.json' });
    archive.file(path.join(WORKSPACE_ROOT, 'package-lock.json'), { name: 'package-lock.json' });

    await archive.finalize();
};
