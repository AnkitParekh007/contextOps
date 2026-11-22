import {describe,expect,it} from "vitest";
import {assess,defaultSettings,labels,mockPredict,reportMarkdown,traces} from "../src/demo-data";

describe("Phase 10 browser-only synthetic assessment",()=>{
  it("loads the exact bounded deterministic Northwind seed without customer data",()=>{
    expect(traces).toHaveLength(500);
    expect(new Set(traces.map(t=>t.id)).size).toBe(500);
    expect(traces[0].ticket).toContain("invoice 10000");
    expect(traces.every(t=>labels.includes(t.label))).toBe(true);
  });
  it("reflects the existing MOCK / mock-efficient failure injection",()=>{
    const erroneous=traces.find(t=>t.ticket.includes("10013"));
    expect(erroneous).toBeDefined();
    expect(mockPredict(erroneous!)).toBe("spam/other");
    expect(erroneous!.label).not.toBe("spam/other");
  });
  it("benchmarks mock results instead of writing invented savings",()=>{
    const result=assess(defaultSettings);
    expect(result.predictions).toHaveLength(30);
    expect(result.quality).toBeCloseTo(29/30);
    expect(result.f1).toBeGreaterThan(0);
    expect(result.passes).toBe(true);
    expect(result.candidateCount).toBe(500);
    expect(result.reviewCount).toBe(0);
    expect(result.projectedMonthly).toBeGreaterThan(0);
  });
  it("fails closed when quality threshold is increased",()=>{
    const result=assess({...defaultSettings,minimumQuality:.99});
    expect(result.passes).toBe(false);
    expect(result.candidateCount).toBe(0);
    expect(result.premiumCount).toBe(500);
  });
  it("does not accidentally equate predicted fallback to a verified saving",()=>{
    const text=reportMarkdown(defaultSettings);
    expect(text).toContain("SIMULATED");
    expect(text).toContain("Verified realized savings: NOT AVAILABLE");
    expect(text).toContain("No live routing");
    expect(text).toContain("first consecutive rows");
  });
  it("higher infrastructure costs can make a scenario unfavorable",()=>{
    const result=assess({...defaultSettings,infrastructureMonthly:50000});
    expect(result.simulated).toBeLessThan(0);
  });
});
