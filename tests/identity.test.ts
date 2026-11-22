import {describe,it,expect} from "vitest";
import {generateTotpSecret,totpAt,matchingTotpCounter,
  makeRecoveryCodes,recoveryHash} from "../src/lib/auth/totp";
import {expirationFromDays} from "../src/lib/retention";

describe("Authenticator codes",()=>{
  it("matches RFC 6238 SHA1 six-digit vectors",()=>{
    const secret="GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(totpAt(secret,1)).toBe("287082");
    expect(matchingTotpCounter(secret,"287082",59_000)).toBe(1);
    expect(matchingTotpCounter(secret,"000000",59_000)).toBeNull();
  });
  it("generates unique secrets and one-use recovery inputs",()=>{
    const secret=generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    const codes=makeRecoveryCodes();
    expect(new Set(codes).size).toBe(8);
    expect(codes.every(code=>recoveryHash(code)!==null)).toBe(true);
    expect(recoveryHash(codes[0])).toHaveLength(64);
    expect(recoveryHash("anything")).toBeNull();
  });
});
describe("Workspace expiry policy",()=>{
  it("accepts only explicit 7–90 day durations",()=>{
    expect(expirationFromDays(7,new Date(0)).toISOString()).toBe("1970-01-08T00:00:00.000Z");
    expect(()=>expirationFromDays(6)).toThrow();
    expect(()=>expirationFromDays(91)).toThrow();
    expect(()=>expirationFromDays(7.5)).toThrow();
  });
});
