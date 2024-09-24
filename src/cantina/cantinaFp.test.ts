import { vi, expect, it } from "vitest"
import { getCantinaFindings } from "./cantinaFp.js"
import fs from "fs"
import { getHmFindings } from "./parse-md.js"
import { CantinaCompetitionsEntity } from "./types.js"
import { E, pipe } from "ti-fptsu/lib"

export let comp = {
  id: "1",
  name: "Bitcoin Staking",
  pdfLink: "https://cantina.xyz/competition/1",
} as unknown as CantinaCompetitionsEntity

it("should get cantina findings", async () => {
  let pdf = fs.readFileSync("./src/cantina/fixtures/opendoc/bitcoin-staking.md", "utf-8")
  let comp = {
    id: "1",
    name: "Bitcoin Staking",
    pdfLink: "https://cantina.xyz/competition/1",
  } as unknown as CantinaCompetitionsEntity

  pipe(
    getHmFindings(pdf, comp),
    E.map((findings) => {
      expect(findings.length).toBe(15)
    }),
  )
})
