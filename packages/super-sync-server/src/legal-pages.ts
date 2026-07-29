/**
 * Whether this instance actually publishes legal pages (a privacy policy, and optionally
 * operator-supplied Terms of Service).
 *
 * The generic Docker image ships no Terms of Service and generates no privacy policy
 * unless the operator identifies themselves as the controller via `PRIVACY_*`. An
 * instance with no legal pages must not ask its users to accept documents that do not
 * exist, so both the registration consent notice and the server-side `termsAccepted`
 * requirement follow this flag.
 *
 * Defaults to `true` so that any consumer which never calls the setter (unit tests,
 * embedded use) keeps the stricter, pre-existing behaviour.
 */
let legalPagesPublished = true;

export const setLegalPagesPublished = (isPublished: boolean): void => {
  legalPagesPublished = isPublished;
};

export const areLegalPagesPublished = (): boolean => legalPagesPublished;
