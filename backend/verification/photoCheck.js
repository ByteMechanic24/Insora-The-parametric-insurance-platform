const { getGeminiConfig, generateStructuredContent } = require('./providers/geminiClient');

function clampScore(value, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizePhotos(photos = []) {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos.filter((photo) => photo && typeof photo.dataUrl === 'string').slice(0, 2);
}

function summarizePhotos(photos = []) {
  return photos.map((photo) => ({
    name: photo.name || null,
    mimeType: photo.mimeType || null,
    sizeBytes: photo.sizeBytes || null,
    capturedAt: photo.capturedAt || null,
  }));
}

function looksLikeProviderIgnoredImage(payload = {}) {
  const reason = String(payload.reason || '').toLowerCase();
  return (
    reason.includes('no image was provided') ||
    reason.includes('no image provided') ||
    reason.includes('visual evidence is required') ||
    reason.includes('unable to process input image')
  );
}

function fallbackPhotoResult(photos, disruptionType, reason, flags = []) {
  const photoCount = photos.length;
  const score = photoCount > 0 ? 0.45 : 0.12;

  return {
    checkName: 'photo_evidence',
    weight: 0.1,
    score,
    confidence: photoCount > 0 ? 'LOW' : 'NONE',
    hardReject: false,
    flags: photoCount > 0 ? ['PHOTO_AI_FALLBACK', ...flags] : ['NO_PHOTO_EVIDENCE', ...flags],
    data: {
      disruptionType,
      photoCount,
      verdict: photoCount > 0 ? 'supportive_unknown' : 'missing',
      usableEvidence: photoCount > 0,
      reason,
      photos: summarizePhotos(photos),
      usedModel: null,
    },
    completedAt: new Date(),
  };
}

function parseGeminiPhotoResult(result, photos, disruptionType, model) {
  const photoCount = photos.length;
  const payload = result?.json || {};
  if (photoCount > 0 && looksLikeProviderIgnoredImage(payload)) {
    return fallbackPhotoResult(
      photos,
      disruptionType,
      'Gemini did not successfully process the uploaded image, so photo evidence fell back to presence-based support.',
      ['PHOTO_AI_RESPONSE_INVALID']
    );
  }

  const verdict = String(payload.verdict || 'uncertain').toLowerCase();
  const usableEvidence = Boolean(payload.usableEvidence ?? photoCount > 0);
  const contradiction = Boolean(payload.contradiction ?? verdict === 'contradictory');
  const rawScore = clampScore(Number(payload.score), photoCount > 0 ? 0.5 : 0.12);

  let score = rawScore;
  if (contradiction) {
    score = Math.min(score, 0.2);
  } else if (verdict === 'supportive') {
    score = Math.max(score, 0.65);
  } else if (verdict === 'insufficient' || verdict === 'uncertain') {
    score = photoCount > 0 ? Math.max(0.35, Math.min(score, 0.55)) : Math.min(score, 0.2);
  }

  const flags = [];
  if (!photoCount) flags.push('NO_PHOTO_EVIDENCE');
  if (contradiction) flags.push('PHOTO_CONTRADICTS_CLAIM');
  if (!usableEvidence && photoCount > 0) flags.push('PHOTO_LOW_INFORMATION');
  if (verdict === 'insufficient' || verdict === 'uncertain') flags.push('PHOTO_REVIEW_RECOMMENDED');

  let confidence = 'LOW';
  if (score >= 0.78) confidence = 'HIGH';
  else if (score >= 0.55) confidence = 'MEDIUM';

  return {
    checkName: 'photo_evidence',
    weight: 0.1,
    score,
    confidence,
    hardReject: false,
    flags,
    data: {
      disruptionType,
      photoCount,
      verdict,
      usableEvidence,
      contradiction,
      reason: payload.reason || 'Photo evidence analyzed by Gemini.',
      detectedSignals: Array.isArray(payload.detectedSignals) ? payload.detectedSignals : [],
      photos: summarizePhotos(photos),
      usedModel: model,
    },
    completedAt: new Date(),
  };
}

async function checkPhotoEvidence(photos = [], disruptionType = 'other') {
  const normalizedPhotos = normalizePhotos(photos);
  if (normalizedPhotos.length === 0) {
    return fallbackPhotoResult(normalizedPhotos, disruptionType, 'No photos uploaded for this claim.');
  }

  const gemini = getGeminiConfig();
  if (!gemini.apiKey) {
    return fallbackPhotoResult(
      normalizedPhotos,
      disruptionType,
      'Gemini key missing, so photo evidence fell back to presence-based support.',
      ['GEMINI_API_KEY_MISSING']
    );
  }

  try {
    const prompt = [
      'You are validating insurance-style claim evidence for a delivery-disruption claim.',
      `Claimed disruption type: ${disruptionType}.`,
      'Assess whether the uploaded photo(s) visually support the claimed disruption.',
      'Return strict JSON with these fields:',
      '{',
      '  "verdict": "supportive" | "uncertain" | "insufficient" | "contradictory",',
      '  "score": number between 0 and 1,',
      '  "usableEvidence": boolean,',
      '  "contradiction": boolean,',
      '  "reason": string,',
      '  "detectedSignals": string[]',
      '}',
      'Be conservative. Do not claim certainty if the image is ambiguous.',
    ].join('\n');

    const result = await generateStructuredContent({
      prompt,
      images: normalizedPhotos,
      model: gemini.model,
    });

    return parseGeminiPhotoResult(result, normalizedPhotos, disruptionType, result.usedModel || gemini.model);
  } catch (error) {
    const providerMessage =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Gemini photo analysis failed.';
    return fallbackPhotoResult(
      normalizedPhotos,
      disruptionType,
      providerMessage,
      ['PHOTO_AI_UNAVAILABLE']
    );
  }
}

module.exports = {
  checkPhotoEvidence,
};
