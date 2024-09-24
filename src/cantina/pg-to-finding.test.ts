import { vi, expect, it } from "vitest"
import { convertToFinding } from "./pg-to-finding.js"
import dedent from "dedent"

it("should convert to finding", () => {
  let pg = dedent`
  "3.1.2 Spending multiple Unbonding transactions is not supported by the Staking indexer 
  
  _Submitted by zigtur, also found by n4nika_
  
  **Severity:** High Risk
  
  **Context:** indexer.go#L683-L691
  `

  let finding = convertToFinding({ finding: pg })

  expect(finding).toBe({
    name: "Spending multiple Unbonding transactions is not supported by the Staking indexer",
    content: dedent`
    _Submitted by zigtur, also found by n4nika_
    
    **Severity:** High Risk
    
    **Context:** indexer.go#L683-L691
    `,
    url: "",
    severity: "High Risk",
    tags: ["none"],
  })
})
