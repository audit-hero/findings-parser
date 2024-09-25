import { Logger } from "jst-logger"
import { FindingStorage, ParseResult } from "../types.js"
import { E, flow, pipe, TE } from "ti-fptsu/lib"
import { loadNextProps } from "../web-load/load-next-props.js"
import { CantinaCompetitionsEntity, CantinaProps } from "./types.js"
import pdf2md from "@opendocsg/pdf2md"
import { log } from "ti-fptsu/log"
import { getHmFindings } from "./parse-md.js"
import { findingsToResults } from "./findings-to-result.js"

export type CantinaParseResult = PdfMd & {
  findings: FindingStorage[]
}
export type PdfMd = { comp: CantinaCompetitionsEntity; pdfMd: string }

export let getCantinaFindings = async (): Promise<ParseResult[]> =>
  pipe(
    getNextProps(),
    log(() => "downloading pdfs"),
    TE.chain(downloadPdfs),
    log(() => "parsing pdfs"),
    TE.chain((pdfs) =>
      pipe(
        pdfs,
        E.traverseArray((pdf) => getHmFindings(pdf.pdfMd, pdf.comp)),
        TE.fromEither,
      ),
    ),
    TE.map((it) => it.flat()),
    TE.map(findingsToResults),
    TE.getOrElse((e) => {
      throw e
    }),
  )()

let getNextProps = () =>
  TE.tryCatch(
    flow(() => "https://cantina.xyz/portfolio?section=cantina-competitions", loadNextProps),
    E.toError,
  )

let downloadPdfs = (props: CantinaProps) =>
  pipe(
    props.cantinaCompetitions.slice(4, 6),
    TE.traverseArray((comp) =>
      pipe(
        TE.fromTask(() => loadPdf(comp)),
        TE.map((pdfMd) => ({ comp, pdfMd })),
      ),
    ),
    TE.map((it) => it as PdfMd[]),
  ) as TE.TaskEither<Error, PdfMd[]>

const loadPdf = async (contest: CantinaCompetitionsEntity): Promise<string> => {
  Logger.debug(`loading pdf ${contest.pdfLink}`)
  let file = await (await fetch(contest.pdfLink)).arrayBuffer()

  // @ts-ignore
  let md = await pdf2md(file)
    .then((text: any) => {
      return text as string
    })
    .catch((err: any) => {
      console.error(err)
      return undefined
    })

  return md
}
