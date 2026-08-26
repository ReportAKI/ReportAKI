
import path from 'node:path';
import { ZipArchive } from 'archiver';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../../../..');

const IGNORE_PATTERNS = [
    'apps/**/node_modules/**',
    'apps/**/dist/**',
    'apps/**/build/**',
    'apps/**/.cache/**',
    'apps/**/.vite/**',
    'apps/**/.git/**',
    'apps/**/pb_data/**',
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

    archive.glob('apps/**/*', {
        cwd: WORKSPACE_ROOT,
        ignore: IGNORE_PATTERNS,
        dot: true,
    });

    archive.file(path.join(WORKSPACE_ROOT, 'package.json'), { name: 'package.json' });
    archive.file(path.join(WORKSPACE_ROOT, 'package-lock.json'), { name: 'package-lock.json' });

    await archive.finalize();
};
