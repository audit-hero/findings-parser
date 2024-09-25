import { pipe } from "ti-fptsu/lib"
import { FindingsContest, FindingStorage, ParseResult } from "../types.js"
import { CantinaParseResult } from "./get-findings.js"
import { trimContestName } from "../trim-contest-name.js"
import { withTagsAndName } from "../util.js"
import { CantinaCompetitionsEntity } from "./types.js"
import { getAnyDateUTCTimestamp } from "../any-date.js"

export let findingsToResults = (findings: CantinaParseResult[]): ParseResult[] =>
  findings.map((it) => {
    let contest = getContest(it)
    let findings = it.findings.map(withTagsAndName)
    return { contest, findings }
  })

// prettier-ignore
let getContest = ({comp}: CantinaParseResult): FindingsContest =>
  pipe(
    getAnyDateUTCTimestamp(comp.timeline.start),
    (date) => ({
      c_name: trimContestName(comp.title, date),
      c_platform: "cantina",
      c_date: date,
      c_add_date: date,
      c_url: `https://cantina.xyz/competitions/${comp.id}`,
    })
  )

export let trimCantinaContestName = (comp: CantinaCompetitionsEntity): string =>
  pipe(getAnyDateUTCTimestamp(comp.timeline.start), (date) => trimContestName(comp.title, date))
