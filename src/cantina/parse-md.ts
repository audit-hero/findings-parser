import { E, flow, O, pipe } from "ti-fptsu/lib"
import { convertToFinding } from "./pg-to-finding.js"
import { Severity } from "ah-shared"
import { CantinaCompetitionsEntity } from "./types.js"
import { CantinaParseResult } from "./get-findings.js"
import { trimCantinaContestName } from "./findings-to-result.js"

export let getHmFindings = (
  md: string,
  contest: CantinaCompetitionsEntity,
): E.Either<Error, CantinaParseResult> =>
  flow(
    () => console.log(`parsing ${trimCantinaContestName(contest)}`),
    () => getHmParagraphs(md),
    (it) => E.traverseArray(getFindingParagraphs)(it),
    E.map((hmParagraphs) =>
      hmParagraphs
        .map((hmParagraph) =>
          hmParagraph.findings.map((finding) => ({
            severity: hmParagraph.severity,
            finding,
            contest,
          })),
        )
        .flat(),
    ),
    E.chain(E.traverseArray(convertToFinding)),
    E.map((it) => ({ findings: it, comp: contest, pdfMd: md } as CantinaParseResult)),
    E.mapLeft((it) => new Error(it)),
  )()

let getHmParagraphs = (md: string): string[] =>
  pipe(
    md.match(/^#{1,4}.*(critical|high|medium)/gim),
    O.fromNullable,
    O.map((matches) => {
      const paragraphs = []
      for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i]
        const startIndex = md.indexOf(currentMatch)
        const currentHeadingLevel = currentMatch.match(/^(#+)/)?.[0].length ?? 0

        // Find the next heading with the same level
        const nextHeadingRegex = new RegExp(`^#{${currentHeadingLevel}}(?!#)`, 'gm')
        nextHeadingRegex.lastIndex = startIndex + currentMatch.length
        const nextHeadingMatch = nextHeadingRegex.exec(md)

        const endIndex = nextHeadingMatch ? nextHeadingMatch.index : md.length
        const paragraph = md.substring(startIndex, endIndex).trim()
        paragraphs.push(paragraph)
      }
      return paragraphs
    }),
    O.getOrElse(() => [] as string[]),
  )

let getFindingParagraphs = (hmParagraph: string) =>
  pipe(
    hmParagraph.match(/^#{1,4}.*(critical|high|medium)/i),
    E.fromNullable("Not a HM paragraph"),
    E.map(() => {
      const regex = /^(\*\*|)(\s+|)(\d+\.\d+\.\d+)/gm
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
        .map(removeAdminComments)
        .map(convertImportantPgToHeadings)
        .map(removeMoreThanDoubleEmptyLines),
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
    const { index } = matches[i]
    let end = i === matches.length - 1 ? hmParagraph.length : matches[i + 1].index
    let paragraph = hmParagraph.substring(index, end).trim()
    paragraphs.push(paragraph)
  }

  return paragraphs
}

// prettier-ignore
export let fixLineBreaks = (paragraph: string): string => 
  paragraph
    .replace(/(?<!^)(\s)(\w)+:\s/gm, '\n\n$&')
    .replace(/(?<!^)(\s)\*\*(\w|\s)+:\*\*\s/gm, '\n\n$&')
    .replace(/\n[^\S\r\n]+/g, '\n')

// \n**Babylon:** Fixed in staking-indexer PR 124."
// eg /remove ^**.*:**.*(fixed|solved|will not)/gmi
export let removeAdminComments = (paragraph: string): string =>
  paragraph.replace(/\n\*\*.*:\*\*.*(fixed|solved|will not).*\n?/gi, "")

export let convertImportantPgToHeadings = (paragraph: string): string =>
  paragraph.replace(
    /^(\*\*|)(Description|Impact|Recommendation|Proof of concept|PoC|Details):(\*\*|)(\s+|)/gim,
    "## $2\n\n",
  )

let removeMoreThanDoubleEmptyLines = (paragraph: string): string =>
  paragraph.replaceAll(/\n{2,}/gm, "\n")
