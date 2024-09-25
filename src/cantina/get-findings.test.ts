import { vi, expect, it } from "vitest"
import fs from "fs"
import { getHmFindings } from "./parse-md.js"
import { CantinaCompetitionsEntity } from "./types.js"
import { E, pipe } from "ti-fptsu/lib"

export let comp = {
  id: "1",
  title: "Bitcoin Staking",
  pdfLink: "https://cantina.xyz/competition/1",
  timeline: {
    start: "02 September 2024",
    end: "08 September 2024",
  },
} as unknown as CantinaCompetitionsEntity

it("should get cantina findings", async () => {
  let pdf = fs.readFileSync("./src/cantina/fixtures/opendoc/bitcoin-staking.md", "utf-8")

  pipe(
    getHmFindings(pdf, comp),
    E.map((findings) => {
      expect(findings.findings.length).toBe(15)
    }),
  )
})
