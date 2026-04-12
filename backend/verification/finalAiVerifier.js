const { getGeminiConfig, generateStructuredContent } = require('./providers/geminiClient');

function clampScore(value, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, value));
}

function buildPrompt(summary) {
  return [
    'You are the final verification reviewer for a parametric insurance claim.',
    'Review the structured evidence below and decide whether the full claim story is internally consistent.',
    'Important:',
    '- Never override hard failures.',
    '- Give higher trust to platform authenticity, location confidence, and disruption validation.',
    '- Photo analysis can increase confidence, especially for flooding, but should not invent missing facts.',
    '- Fraud signals reduce trust.',
    'Return strict JSON with these fields:',
    '{',
    '  "overallVerificationScore": number between 0 and 1,',
    '  "consistencyScore": number between 0 and 1,',
    '  "recommendedOutcome": "APPROVE" | "MANUAL_REVIEW" | "REJECT",',
    '  "reason": string,',
    '  "keyConcerns": string[]',
    '}',
    'Structured evidence:',
    JSON.stringify(summary, null, 2),
  ].join('\n');
}

function fallbackAiResult(summary, deterministicScore, reason, flags = []) {
  const score = clampScore(deterministicScore, 0.5);
  return {
    checkName: 'ai_final_verifier',
    weight: 0,
    score,
    confidence: score >= 0.75 ? 'HIGH' : score >= 0.55 ? 'MEDIUM' : 'LOW',
    hardReject: false,
    flags: ['AI_FINAL_FALLBACK', ...flags],
    data: {
      recommendedOutcome: score >= 0.75 ? 'APPROVE' : score >= 0.45 ? 'MANUAL_REVIEW' : 'REJECT',
      consistencyScore: score,
      reason,
      keyConcerns: [],
      evidenceDigest: summary,
      usedModel: null,
    },
    completedAt: new Date(),
  };
}

async function runFinalAiVerifier(summary, deterministicScore) {
  const gemini = getGeminiConfig();
  if (!gemini.apiKey) {
    return fallbackAiResult(
      summary,
      deterministicScore,
      'Gemini key missing, so AI final verification fell back to deterministic confidence.',
      ['GEMINI_API_KEY_MISSING']
    );
  }

  try {
    const result = await generateStructuredContent({
      prompt: buildPrompt(summary),
      model: gemini.model,
    });

    const payload = result?.json || {};
    const score = clampScore(Number(payload.overallVerificationScore), deterministicScore);
    const consistencyScore = clampScore(Number(payload.consistencyScore), score);

    return {
      checkName: 'ai_final_verifier',
      weight: 0,
      score,
      confidence: score >= 0.78 ? 'HIGH' : score >= 0.55 ? 'MEDIUM' : 'LOW',
      hardReject: false,
      flags: [],
      data: {
        recommendedOutcome: payload.recommendedOutcome || 'MANUAL_REVIEW',
        consistencyScore,
        reason: payload.reason || 'Gemini final verifier completed successfully.',
        keyConcerns: Array.isArray(payload.keyConcerns) ? payload.keyConcerns : [],
        evidenceDigest: summary,
        usedModel: result.usedModel || gemini.model,
      },
      completedAt: new Date(),
    };
  } catch (error) {
    return fallbackAiResult(
      summary,
      deterministicScore,
      error.message || 'Gemini final verification failed.',
      ['AI_FINAL_UNAVAILABLE']
    );
  }
}

module.exports = {
  runFinalAiVerifier,
};
