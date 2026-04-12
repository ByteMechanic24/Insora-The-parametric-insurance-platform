function clampScore(value, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, value));
}

function scoreOf(check, fallback = 0) {
  return clampScore(check?.score, fallback);
}

function computeDeterministicScore({ platformCheck, locationCheck, disruptionCheck, photoCheck, fraudCheck }) {
  const baseScore =
    (scoreOf(platformCheck) * 0.3) +
    (scoreOf(locationCheck) * 0.3) +
    (scoreOf(disruptionCheck) * 0.25) +
    (scoreOf(photoCheck, 0.2) * 0.1);

  const fraudAdjustment = (scoreOf(fraudCheck, 0.5) - 0.5) * 0.1;
  return clampScore(baseScore + fraudAdjustment);
}

function decideOutcome({
  disruptionType,
  platformCheck,
  locationCheck,
  disruptionCheck,
  photoCheck,
  fraudCheck,
  aiCheck,
}) {
  const deterministicScore = computeDeterministicScore({
    platformCheck,
    locationCheck,
    disruptionCheck,
    photoCheck,
    fraudCheck,
  });
  const aiScore = scoreOf(aiCheck, deterministicScore);
  const finalScore = clampScore((deterministicScore * 0.75) + (aiScore * 0.25));

  if ([platformCheck, locationCheck, disruptionCheck, photoCheck, fraudCheck].some((check) => check?.hardReject)) {
    return {
      deterministicScore,
      finalScore: 0,
      decision: 'REJECT',
      reason: 'A required verification gate failed during claim processing.',
    };
  }

  if (scoreOf(platformCheck) < 0.55) {
    return {
      deterministicScore,
      finalScore,
      decision: 'REJECT',
      reason: 'Platform evidence is too weak or contradictory for this claim.',
    };
  }

  if (scoreOf(locationCheck) < 0.4) {
    return {
      deterministicScore,
      finalScore,
      decision: 'REJECT',
      reason: 'Worker location does not align strongly enough with the platform order context.',
    };
  }

  if (['road_closure', 'strike'].includes(disruptionType)) {
    if (deterministicScore >= 0.5 && aiScore >= 0.55) {
      return {
        deterministicScore,
        finalScore,
        decision: 'MANUAL_REVIEW',
        reason: 'This disruption type needs human review even when the supporting signals are credible.',
      };
    }

    return {
      deterministicScore,
      finalScore,
      decision: 'REJECT',
      reason: 'Road-closure and strike claims need stronger human-verifiable evidence for approval.',
    };
  }

  if (disruptionType === 'flooding') {
    const photoScore = scoreOf(photoCheck, 0.2);
    const disruptionScore = scoreOf(disruptionCheck);
    const locationScore = scoreOf(locationCheck);

    if (
      deterministicScore >= 0.72 &&
      aiScore >= 0.75 &&
      photoScore >= 0.65 &&
      disruptionScore >= 0.6 &&
      locationScore >= 0.6
    ) {
      return {
        deterministicScore,
        finalScore,
        decision: 'APPROVE',
        reason: 'Flood evidence is consistent across platform, location, weather, and photo validation.',
      };
    }

    if (deterministicScore >= 0.5 && aiScore >= 0.55) {
      return {
        deterministicScore,
        finalScore,
        decision: 'MANUAL_REVIEW',
        reason: 'Flood claim is plausible but still needs human confirmation before payout.',
      };
    }

    return {
      deterministicScore,
      finalScore,
      decision: 'REJECT',
      reason: 'Flooding evidence is not strong enough for approval or manual escalation.',
    };
  }

  if (deterministicScore < 0.45) {
    return {
      deterministicScore,
      finalScore,
      decision: 'REJECT',
      reason: 'The combined deterministic evidence is too weak to support this claim.',
    };
  }

  if (deterministicScore >= 0.75 && aiScore >= 0.75) {
    return {
      deterministicScore,
      finalScore,
      decision: 'APPROVE',
      reason: 'The deterministic checks and AI verifier both support approval confidently.',
    };
  }

  if (deterministicScore >= 0.55 && aiScore >= 0.55) {
    return {
      deterministicScore,
      finalScore,
      decision: 'MANUAL_REVIEW',
      reason: 'The claim is credible but still needs human review under the balanced policy.',
    };
  }

  return {
    deterministicScore,
    finalScore,
    decision: 'REJECT',
    reason: 'The evidence remains too inconsistent for approval.',
  };
}

module.exports = {
  computeDeterministicScore,
  decideOutcome,
};
