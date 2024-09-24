import { vi, expect, it } from "vitest"
import fs from "fs"
import { fixLineBreaks, getHmFindings, removeAdminComments } from "./parse-md.js"
import dedent from "dedent"

it("should parse markdown", () => {
  const md = fs.readFileSync("./src/cantina/fixtures/opendoc/bitcoin-staking.md", "utf-8")

  let findings = getHmFindings(md)

  expect(findings.length).toBe(5)
})

it("should fix line breaks", () => {
  let pg = dedent`
  3.1.2 Spending multiple Unbonding transactions is not supported by the Staking indexer \n\n_Submitted by zigtur, also found by n4nika_ **Severity:** High Risk **Context:** indexer.go#L683-L691 **Description:** The getSpentUnbondingTx function \n\n**Babylon:** Fixed in staking-indexer PR 124.`

  let fixed = fixLineBreaks(pg)
  console.log(fixed)

  expect(fixed).toBe(
    "3.1.2 Spending multiple Unbonding transactions is not supported by the Staking indexer \n\n_Submitted by zigtur, also found by n4nika_\n\n**Severity:** High Risk\n\n**Context:** indexer.go#L683-L691\n\n**Description:** The getSpentUnbondingTx function \n\n**Babylon:** Fixed in staking-indexer PR 124.",
  )
})

it("should remove admin comments", () => {
  let pg = dedent`
  some text
  **Babylon:** Fixed in staking-indexer PR 124.
  `

  let fixed = removeAdminComments(pg)
  expect(fixed).toBe("some text")
})

it("should convert to finding", () => {
  let pg = dedent`
  "3.1.2 Spending multiple Unbonding transactions is not supported by the Staking indexer 
  
  _Submitted by zigtur, also found by n4nika_
  
  **Severity:** High Risk
  
  **Context:** indexer.go#L683-L691
  
  **Description:** The getSpentUnbondingTx function 
  
  **Babylon:** Fixed in staking-indexer PR 124."
  `

  let finding = convertToFinding(pg)
  expect(finding).toBe({
    
  })
})