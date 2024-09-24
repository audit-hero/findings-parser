import { expect, it } from "vitest";
import { convertToFinding } from "./pg-to-finding.js";
import dedent from "dedent";
import { comp } from "./cantinaFp.test.js";
import { Severity } from "ah-shared";
import { pipe, E } from "ti-fptsu/lib";
it("should convert to finding", () => {
    let pg = dedent `
  3.1.2 Spending multiple Unbonding transactions is not supported by the Staking indexer 
  
  _Submitted by zigtur, also found by n4nika_
  
  **Severity:** High Risk
  
  **Context:** indexer.go#L683-L691
  `;
    pipe(convertToFinding({ finding: pg, severity: Severity.HIGH, contest: comp }), E.map((it) => {
        expect(it).toStrictEqual({
            name: "Spending multiple Unbonding transactions is not supported by the Staking indexer",
            content: dedent `
    _Submitted by zigtur, also found by n4nika_
    
    **Severity:** High Risk
    
    **Context:** indexer.go#L683-L691
    `,
            url: "https://cantina.xyz/competition/1",
            pk: "",
            platform: "cantina",
            severity: Severity.HIGH,
            tags: ["none"],
        });
    }), E.getOrElseW(() => {
        throw new Error("should not happen");
    }));
});
//# sourceMappingURL=pg-to-finding.test.js.map