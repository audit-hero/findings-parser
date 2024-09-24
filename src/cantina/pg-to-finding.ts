import { pipe, E } from "ti-fptsu/lib"
import { FindingStorage } from "../types.js"
import { CantinaCompetitionsEntity } from "./types.js"
import { Platform, Severity } from "ah-shared"

type Input = {
  severity: Severity
  finding: string
  contest: CantinaCompetitionsEntity
}

// get pk, name, content, url (contest page), severity, tags,
export let convertToFinding = (input: Input): E.Either<string, FindingStorage> =>
  pipe(
    E.Do,
    E.apS("name", E.of(getName(input))),
    E.apS("content", E.of(getContent(input))),
    E.apS("url", E.of(getUrl(input))),
    E.apS("severity", E.of(input.severity)),
    E.apS("tags", E.of(["none"])),
    E.apS("pk", E.of("")),
    E.apS("platform", E.of("cantina" as Platform)),
  )

let getName = (input: Input) => {
  let { finding } = input
  return finding
    .split(/^(\*\*|)\d+\.\d+\.\d+(\*\*|) /)[3]
    .split("\n")[0]
    .trim()
}

let getContent = (input: Input) => {
  let { finding } = input
  return finding
    .split(/^(\*\*|)\d+\.\d+\.\d+(\*\*|) /)[3]
    .split("\n")
    .slice(1)
    .join("\n")
    .trim()
}

let getUrl = (input: Input) => {
  let { contest } = input
  return `https://cantina.xyz/competition/${contest.id}`
}
