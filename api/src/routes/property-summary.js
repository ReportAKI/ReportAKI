import { Router } from 'express';
import { integratedAiRateLimit } from '../middleware/integrated-ai-rate-limit.js';

const router = Router();

router.post('/', integratedAiRateLimit, async (req, res) => {
    const { kaek, geoData, area } = req.body || {};

    if (!kaek) {
        return res.status(422).json({ error: 'kaek is required' });
    }

    // Διαμόρφωση των δεδομένων σε απλά ελληνικά
    const address = geoData?.fullAddress || "μια περιοχή χωρίς συγκεκριμένη διεύθυνση";
    const municipality = geoData?.structuredAddress?.municipality || "τον δήμο";
    const areaInfo = area ? `συνολικής έκτασης περίπου ${Math.round(area)} τετραγωνικών μέτρων` : "";

    // Η σύνοψη σε μία ενιαία και φιλική παράγραφο
    const summary = `Το ακίνητο με κωδικό ${kaek} βρίσκεται στη διεύθυνση ${address}, στον δήμο ${municipality}${areaInfo ? `, και είναι ${areaInfo}` : ""}. Πρόκειται για μια επίσημη καταγραφή στο σύστημα, η οποία παρέχει βασικές πληροφορίες για τη θέση και τα χαρακτηριστικά του ακινήτου με έναν απλό και κατανοητό τρόπο για όλους.`;

    // Επιστροφή της απάντησης
    return res.json({ summary: summary });
});

export default router;