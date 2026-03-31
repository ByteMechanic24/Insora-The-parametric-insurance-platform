import { getClaims, getCurrentPolicy } from './api';

const STALE_AFTER_MS = 45_000;

let claimsSnapshot = null;
let policySnapshot = null;
let claimsFetchedAt = 0;
let policyFetchedAt = 0;
let claimsPromise = null;
let policyPromise = null;

function isFresh(timestamp) {
  return timestamp && Date.now() - timestamp < STALE_AFTER_MS;
}

export function getCachedClaimsSnapshot() {
  return isFresh(claimsFetchedAt) ? claimsSnapshot : null;
}

export function getCachedPolicySnapshot() {
  return isFresh(policyFetchedAt) ? policySnapshot : null;
}

export function primeWorkerReads() {
  if (!claimsPromise) {
    claimsPromise = getClaims({ limit: 20 })
      .then((claims) => {
        claimsSnapshot = claims;
        claimsFetchedAt = Date.now();
        return claims;
      })
      .catch(() => [])
      .finally(() => {
        claimsPromise = null;
      });
  }

  if (!policyPromise) {
    policyPromise = getCurrentPolicy()
      .then((policy) => {
        policySnapshot = policy;
        policyFetchedAt = Date.now();
        return policy;
      })
      .catch(() => null)
      .finally(() => {
        policyPromise = null;
      });
  }

  return Promise.allSettled([claimsPromise, policyPromise]);
}

export function updateClaimsSnapshot(claims) {
  claimsSnapshot = claims;
  claimsFetchedAt = Date.now();
}

export function updatePolicySnapshot(policy) {
  policySnapshot = policy;
  policyFetchedAt = Date.now();
}

export function clearWorkerSnapshots() {
  claimsSnapshot = null;
  policySnapshot = null;
  claimsFetchedAt = 0;
  policyFetchedAt = 0;
  claimsPromise = null;
  policyPromise = null;
}
