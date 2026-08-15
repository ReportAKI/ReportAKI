import { Router } from 'express';
import { ContentBlockType, stream } from '../api/integrated-ai.js';
import { PropertySummarySystemPrompt } from '../constants/prompts.js';
import { integratedAiRateLimit } from '../middleware/integrated-ai-rate-limit.js';


const router = Router();

const MAX_CATEGORY_RECORDS = 6;
const MAX_FIELDS_PER_RECORD = 10;

function buildPropertyPromptText({ kaek, geoData, area, perimeter, coords, sdigmap }) {
	const lines = [];

	lines.push(`ΚΑΕΚ: ${kaek}`);

	if (geoData?.fullAddress) {
		lines.push(`Διεύθυνση: ${geoData.fullAddress}`);
	}
	if (geoData?.structuredAddress?.municipality) {
		lines.push(`Δήμος: ${geoData.structuredAddress.municipality}`);
	}
	if (geoData?.structuredAddress?.regionalUnit) {
		lines.push(`Νομός/Περιφερειακή Ενότητα: ${geoData.structuredAddress.regionalUnit}`);
	}
	if (typeof area === 'number' && area > 0) {
		lines.push(`Εμβαδόν: ${Math.round(area)} τ.μ.`);
	}
	if (typeof perimeter === 'number' && perimeter > 0) {
		lines.push(`Περίμετρος: ${Math.round(perimeter)} μ.`);
	}
	if (coords) {
		lines.push(`Συντεταγμένες: ${typeof coords === 'string' ? coords : `${coords.latitude}, ${coords.longitude}`}`);
	}

	if (sdigmap?.categories?.length) {
		lines.push('Δεδομένα SDIGMAP ανά κατηγορία:');
		for (const category of sdigmap.categories) {
			lines.push(`- ${category.label}:`);
			for (const layer of category.layers || []) {
				const records = (layer.records || []).slice(0, MAX_CATEGORY_RECORDS);
				for (const row of records) {
					const fields = (row || []).slice(0, MAX_FIELDS_PER_RECORD);
					for (const field of fields) {
						if (field.value) {
							lines.push(`  * ${field.field}: ${field.value}`);
						}
					}
				}
			}
		}
	}

	return lines.join('\n');
}

router.post('/', integratedAiRateLimit, async (req, res) => {
	const { kaek, geoData, area, perimeter, coords, sdigmap } = req.body || {};

	if (!kaek) {
		return res.status(422).json({ error: 'kaek is required' });
	}

	const promptText = buildPropertyPromptText({ kaek, geoData, area, perimeter, coords, sdigmap });

	const sseStream = await stream({
		userId: undefined,
		systemPrompt: PropertySummarySystemPrompt,
		userMessage: [{ type: ContentBlockType.Text, text: promptText }],
	});

	let sseBuffer = '';
	let content = '';
	let streamErrorMessage = null;

	sseStream.on('data', (chunk) => {
		sseBuffer += chunk.toString('utf-8');
		const parts = sseBuffer.split('\n\n');
		sseBuffer = parts.pop() || '';

		for (const part of parts) {
			const dataLine = part.split('\n').find(line => line.startsWith('data: '));
			if (!dataLine) {
				continue;
			}

			const jsonStr = dataLine.slice(6);
			if (jsonStr === '[DONE]') {
				continue;
			}

			const parsed = JSON.parse(jsonStr);

			if (parsed.type === 'content' && parsed.data?.content) {
				content += parsed.data.content;
			}

			if (parsed.type === 'error') {
				streamErrorMessage = parsed.data?.content || 'Σφάλμα δημιουργίας σύνοψης';
			}
		}
	});

	await new Promise((resolve, reject) => {
		sseStream.on('end', resolve);
		sseStream.on('error', reject);
	});

	if (streamErrorMessage) {
		console.error(`Σφάλμα σύνοψης: ${streamErrorMessage}`);
		throw new Error(streamErrorMessage);
	}

	if (!content.trim()) {
		throw new Error('Κενή σύνοψη');
	}

	res.json({ summary: content.trim() });
});

export default router;
