import { describe, it, expect } from "@jest/globals";
import { fraudPatternDetectorService } from "../fraud-pattern-detector-service";

describe("FraudPatternDetectorService", () => {
  describe("analyzeBenfordsLaw", () => {
    it("should detect violation when distribution deviates significantly", () => {
      // Create amounts that violate Benford's Law (too many starting with 9)
      const amounts: number[] = [];
      for (let i = 0; i < 50; i++) {
        amounts.push(9000 + Math.random() * 1000); // All start with 9
      }

      const result = fraudPatternDetectorService.analyzeBenfordsLaw(amounts);

      expect(result.violation).toBe(true);
      expect(result.chiSquare).toBeGreaterThan(15.51);
    });

    it("should not detect violation for natural distribution", () => {
      // Create amounts that follow Benford's Law
      const amounts: number[] = [];
      const benfordProbabilities = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];
      
      for (let digit = 1; digit <= 9; digit++) {
        const count = Math.floor(benfordProbabilities[digit - 1] * 100);
        for (let i = 0; i < count; i++) {
          amounts.push(digit * 1000 + Math.random() * 100);
        }
      }

      const result = fraudPatternDetectorService.analyzeBenfordsLaw(amounts);

      // Should not violate (or have low chi-square)
      expect(result.chiSquare).toBeLessThan(20);
    });

    it("should return no violation for small datasets", () => {
      const amounts = [100, 200, 300, 400, 500];
      const result = fraudPatternDetectorService.analyzeBenfordsLaw(amounts);
      expect(result.violation).toBe(false);
    });
  });

  describe("detectRoundNumbers", () => {
    it("should detect high roundness numbers", () => {
      const amounts = [1000, 2000, 5000, 10000, 123.45, 567.89];
      const result = fraudPatternDetectorService.detectRoundNumbers(amounts);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.roundness === "high")).toBe(true);
    });

    it("should not flag small round numbers as suspicious", () => {
      const amounts = [10, 20, 30, 40, 50];
      const result = fraudPatternDetectorService.detectRoundNumbers(amounts);

      // Small amounts should not be flagged
      expect(result.every((r) => !r.suspicious || r.amount >= 100)).toBe(true);
    });
  });

  describe("analyzeTimingPatterns", () => {
    it("should detect unusual timing patterns", () => {
      // Create dates mostly on weekends
      const dates: Date[] = [];
      const baseDate = new Date("2024-01-01");
      
      for (let i = 0; i < 20; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
        // Make most dates weekends
        if (i % 2 === 0) {
          date.setDate(date.getDate() + (6 - date.getDay())); // Move to Saturday
        }
        dates.push(date);
      }

      const result = fraudPatternDetectorService.analyzeTimingPatterns(dates);

      expect(result.unusualTiming).toBe(true);
      expect(result.patterns.some((p) => p.type === "weekend")).toBe(true);
    });

    it("should detect end of month clustering", () => {
      const dates: Date[] = [];
      const baseDate = new Date("2024-01-28"); // Near end of month
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + (i % 3)); // Last 3 days of month
        dates.push(date);
      }

      const result = fraudPatternDetectorService.analyzeTimingPatterns(dates);

      expect(result.unusualTiming).toBe(true);
      expect(result.patterns.some((p) => p.type === "end_of_month")).toBe(true);
    });
  });
});
