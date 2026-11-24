import { z } from "zod/v4";

// Client-supplied marketing origin is untrusted: short plain text only, an invalid value is stored as null.
const label = z.string().trim().min(1).max(100).regex(/^[\p{L}\p{N} ._~+-]+$/u).nullish().catch(null);
const host = z.string().trim().toLowerCase().max(253).regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/).nullish().catch(null);
const attributionSchema = z.object({
  signupUtmSource: label,
  signupUtmMedium: label,
  signupUtmCampaign: label,
  signupReferrerHost: host,
}).catch({});

export function signupAttribution(input: unknown) {
  const value = attributionSchema.parse(input);
  return {
    signupUtmSource: value.signupUtmSource ?? null,
    signupUtmMedium: value.signupUtmMedium ?? null,
    signupUtmCampaign: value.signupUtmCampaign ?? null,
    signupReferrerHost: value.signupReferrerHost ?? null,
  };
}
