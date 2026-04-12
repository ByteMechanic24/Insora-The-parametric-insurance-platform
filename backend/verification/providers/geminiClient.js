const axios = require('axios');
const { getEnvConfig } = require('../../config/env');

function getGeminiConfig() {
  const config = getEnvConfig();
  return {
    apiKey: config.gemini.apiKey,
    model: config.gemini.model,
    fallbackModels: config.gemini.fallbackModels,
    baseUrl: config.gemini.baseUrl.replace(/\/+$/, ''),
    maxRetries: config.gemini.maxRetries,
    retryDelayMs: config.gemini.retryDelayMs,
  };
}

function stripDataUrl(dataUrl = '') {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

function extractJson(text = '') {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (innerError) {
        return null;
      }
    }
  }

  return null;
}

async function generateStructuredContent({ prompt, images = [], model }) {
  const {
    apiKey,
    baseUrl,
    model: defaultModel,
    fallbackModels,
    maxRetries,
    retryDelayMs,
  } = getGeminiConfig();

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  const parts = [{ text: prompt }];
  for (const image of images) {
    const inlineData = stripDataUrl(image?.dataUrl);
    if (inlineData) {
      parts.push({ inlineData });
    }
  }

  const attemptedModels = [];
  const modelsToTry = [model || defaultModel, ...(fallbackModels || [])].filter(
    (value, index, collection) => value && collection.indexOf(value) === index
  );
  let lastError = null;

  for (const candidateModel of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      attemptedModels.push(candidateModel);
      try {
        const response = await axios.post(
          `${baseUrl}/models/${encodeURIComponent(candidateModel)}:generateContent`,
          {
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          },
          {
            params: { key: apiKey },
            timeout: 15000,
          }
        );

        const text = response.data?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || '')
          .join('\n')
          .trim();

        return {
          raw: response.data,
          text,
          json: extractJson(text),
          usedModel: candidateModel,
          attemptedModels,
        };
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        const isRetryable = status === 429 || status === 500 || status === 503;
        if (!isRetryable || attempt >= maxRetries) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
      }
    }
  }

  if (lastError) {
    lastError.attemptedModels = attemptedModels;
    const status = lastError?.response?.status;
    const providerMessage = lastError?.response?.data?.error?.message || lastError.message || 'Gemini request failed';
    lastError.message = `${providerMessage}${status ? ` (status ${status})` : ''}; attempted models: ${attemptedModels.join(', ')}`;
    throw lastError;
  }

  throw new Error('GEMINI_REQUEST_FAILED');
}

module.exports = {
  generateStructuredContent,
  stripDataUrl,
  getGeminiConfig,
};
