import { it, expect } from "vitest";
import { parseSherlockFindings } from "./sherlockFindingsParser.js";
it("removes H- and M- from name", () => {
    let h2 = `# Issue H-10: CompoundProvider incorrectly 

  Source: https://github.com/sherlock-audit/2023-01-derby-judging/issues/202 
  
  ## Found by 
  Jeiwan, hyh`;
    let results = parseSherlockFindings({
        repo: {
            name: "asd"
        }
    }, h2);
    expect(results.findings[0].name).toBe("CompoundProvider incorrectly");
    let h1 = `# Issue H-1: CompoundProvider

  Source:`;
    let results2 = parseSherlockFindings({
        repo: {
            name: "asd"
        }
    }, h1);
    expect(results2.findings[0].name).toBe("CompoundProvider");
    let m2 = `# Issue M-21: CompoundProvider's balanceUnderlying and calcShares outputs are scaled incorrectly

  Source:`;
    let results3 = parseSherlockFindings({
        repo: {
            name: "asd"
        }
    }, m2);
    expect(results3.findings[0].name).toBe("CompoundProvider's balanceUnderlying and calcShares outputs are scaled incorrectly");
});
//# sourceMappingURL=sherlockFindingsParser.test.js.map