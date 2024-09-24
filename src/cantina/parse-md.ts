import { E, pipe } from "ti-fptsu/lib"
import { FindingStorage } from "../types.js"
import { convertToFinding } from "./pg-to-finding.js"
import { Severity } from "ah-shared"
import { CantinaCompetitionsEntity } from "./types.js"

export let getHmFindings = (
  md: string,
  contest: CantinaCompetitionsEntity,
): E.Either<Error, FindingStorage[]> =>
  pipe(
    getHmParagraphs(md),
    E.chain((it) => E.traverseArray(getFindingParagraphs)(it)),
    E.map((hmParagraphs) =>
      hmParagraphs.map((hmParagraph) =>
        hmParagraph.findings.map((finding) => ({
          severity: hmParagraph.severity,
          finding,
          contest,
        })),
      ),
    ),
    E.map((it) => it.flat()),
    E.chain(E.traverseArray(convertToFinding)),
    E.map((it) => it as FindingStorage[]),
    E.mapLeft((it) => new Error(it)),
  )

let getHmParagraphs = (md: string) /* : string[] */ =>
  pipe(
    md.match(/^#{1,4}.*(high|medium)/gim),
    E.fromNullable("No headings found"),
    E.chain((it) => (it.length === 2 ? E.right(it) : E.left("Should have 2 headings"))),
    // 2 string paragraphs from the regex
    E.map((it) => {
      const firstMatchIndex = md.indexOf(it[0])
      const secondMatchIndex = md.indexOf(it[1])
      const firstParagraph = md.substring(firstMatchIndex, secondMatchIndex).trim()
      const secondParagraph = md.substring(secondMatchIndex).trim()
      return [firstParagraph, secondParagraph]
    }),
  )

let getFindingParagraphs = (hmParagraph: string) =>
  pipe(
    hmParagraph.match(/^#{1,4}.*(high|medium)/i),
    E.fromNullable("Not a HM paragraph"),
    E.map(() => {
      const regex = /^\s+(\d+\.\d+\.\d+|\*\*\d+\.\d+\.\d+\*\*)/gm
      let match
      const matches = []
      while ((match = regex.exec(hmParagraph)) !== null) {
        matches.push({ match: match[0], index: match.index })
      }
      return matches
    }),
    E.chain((it) => E.fromNullable("No findings")(it)),
    E.map((matches) =>
      getFindingParagraphsFromMatches(hmParagraph, matches)
        .map(fixLineBreaks)
        .map(removeAdminComments),
    ),
    E.map((it) => ({
      severity: hmParagraph.match(/^#{1,4}.*(high)/im) ? Severity.HIGH : Severity.MEDIUM,
      findings: it,
    })),
  )

let getFindingParagraphsFromMatches = (
  hmParagraph: string,
  matches: { match: string; index: number }[],
) => {
  const paragraphs = []

  for (let i = 0; i < matches.length; i++) {
    const { match, index } = matches[i]
    let end = i === matches.length - 1 ? hmParagraph.length : matches[i + 1].index
    let paragraph = hmParagraph.substring(index, end).trim()
    paragraphs.push(paragraph)
  }

  return paragraphs
}

// prettier-ignore
export let fixLineBreaks = (paragraph: string): string => 
    paragraph.replace(/(?<!^)(\s)\w+:\s/gm, '\n\n$&')
    .replace(/(?<!^)(\s)\*\*\w+:\*\*\s/gm, '\n\n$&')
    .replace(/\n[^\S\r\n]+/g, '\n') // Remove leading spaces

// \n**Babylon:** Fixed in staking-indexer PR 124."
// eg /remove ^**.*:**.*(fixed|solved|will not)/gmi
export let removeAdminComments = (paragraph: string): string =>
  paragraph.replace(/\n\*\*.*:\*\*.*(fixed|solved|will not).*\n?/gi, "")
