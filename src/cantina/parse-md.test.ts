import { vi, expect, it } from "vitest"
import fs from "fs"
import {
  convertImportantPgToHeadings,
  fixLineBreaks,
  getHmFindings,
  removeAdminComments,
} from "./parse-md.js"
import dedent from "dedent"
import { convertToFinding } from "./pg-to-finding.js"
import { comp } from "./cantinaFp.test.js"
import { Severity } from "ah-shared"
import { pipe, E } from "ti-fptsu/lib"

it("should parse markdown", () => {
  const md = fs.readFileSync("./src/cantina/fixtures/opendoc/bitcoin-staking.md", "utf-8")

  pipe(
    getHmFindings(md, comp),
    E.map((it) => expect(it.length).toBe(15)),
    E.orElse((e) => {
      throw e
    }),
  )
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

it("fix bold line breaks", () => {
  let pg = dedent`
  	Only withdrawal transactions will be able to exploit this issue.* **Proof of concept:** The issue lies in the getSpentStakingTx.
`

  let fixed = fixLineBreaks(pg)
  expect(fixed).toBe(
    "Only withdrawal transactions will be able to exploit this issue.*\n\n**Proof of concept:** The issue lies in the getSpentStakingTx.",
  )
})

it("only allows words for bold headings (**)", () => {
  let pg = dedent`
  Babylon: Fixed in covenant-signer PR 43. 


  3.2.3 Staking API service can be crashed remotely due to unbounded size of request 

  Submitted by zigtur Severity: Medium Risk Context: server.go#L33-L35 Description: The Staking API service is a critical component of Babylon.
  `

  let fixed = fixLineBreaks(pg)
  expect(fixed).to.not.match(/^3.2.3$/im)
})

it("should remove admin comments", () => {
  let pg = dedent`
  some text
  **Babylon:** Fixed in staking-indexer PR 124.
  `

  let fixed = removeAdminComments(pg)
  expect(fixed).toBe("some text")
})

it("should convert important paragraphs to headings", () => {
  let pg = dedent`
  Description: The getSpentUnbondingTx function 
  `

  let fixed = convertImportantPgToHeadings(pg)
  expect(fixed).toBe("## Description\n\nThe getSpentUnbondingTx function")
})
