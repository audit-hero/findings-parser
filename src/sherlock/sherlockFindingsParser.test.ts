import { it, expect } from "vitest"

import { parseSherlockFindings } from "./sherlockFindingsParser.js"
import fs from "fs"

it("removes H- and M- from name", () => {
  let h2 = `# Issue H-10: CompoundProvider incorrectly 

  Source: https://github.com/sherlock-audit/2023-01-derby-judging/issues/202 
  
  ## Found by 
  Jeiwan, hyh`

  let results = parseSherlockFindings(
    {
      repo: {
        name: "asd",
      },
    } as any,
    h2
  )
  expect(results.findings[0].name).toBe("CompoundProvider incorrectly")

  let h1 = `# Issue H-1: CompoundProvider

  Source:`
  let results2 = parseSherlockFindings(
    {
      repo: {
        name: "asd",
      },
    } as any,
    h1
  )
  expect(results2.findings[0].name).toBe("CompoundProvider")

  let m2 = `# Issue M-21: CompoundProvider's balanceUnderlying and calcShares outputs are scaled incorrectly

  Source:`

  let results3 = parseSherlockFindings(
    {
      repo: {
        name: "asd",
      },
    } as any,
    m2
  )
  expect(results3.findings[0].name).toBe(
    "CompoundProvider's balanceUnderlying and calcShares outputs are scaled incorrectly"
  )
})

it("does not remove found by header", () => {
  // here one finding has only 2 lines of content and # Found by header
  // this findings-parser does not trim any content, therefore we want these lines to exist

  let md = fs.readFileSync("src/sherlock/fixtures/foundByHeader.md", "utf-8")

  let result = parseSherlockFindings(
    {
      repo: {
        name: "asd",
      },
    } as any,
    md
  )
  expect(
    result.findings[6].content.split("\n").filter((it) => it.trim().length > 0)
      .length
  ).toBe(3)
})

it("should find correct issue start headers", () => {
  // here one finding has a paragraph ##### Issue... This should not be considered as a finding
  let md = fs.readFileSync("src/sherlock/fixtures/aLotOfHeaders.md", "utf-8")
  let result = parseSherlockFindings(
    {
      repo: {
        name: "asd",
      },
    } as any,
    md
  )

  // last header should be Recommendation
  expect(
    result.findings[24].content
      .split("\n")
      .filter((it) => it.match(/^#{1,6}.*$/))
      .at(-1)
  ).toBe("## Recommendation")
})
