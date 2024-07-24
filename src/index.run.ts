import Logger from "js-logger"
import { downloadC4Readme, getC4Contests, parseC4Findings } from "./c4/c4FindingsParser"
import { getFindings } from "./util.js"
import { downloadSherlockReadme, getSherlockContests, parseSherlockFindings } from "./sherlock/sherlockFindingsParser.js"
import { setParserConfig } from "./config.js"

Logger.useDefaults()
setParserConfig(
  { dontIncludeJudgeComments: true, dontParseTags: false }
)

// let sherlockFindings = await getFindings(getSherlockContests, downloadSherlockReadme, parseSherlockFindings)

// let sherlockFindingsCount = sherlockFindings.reduce((acc, it) => acc + it.findings.length, 0)
// Logger.info(`Got ${sherlockFindingsCount} findings for ${sherlockFindings.length} sherlock contests`)

let c4findings = await getFindings(getC4Contests, downloadC4Readme, parseC4Findings)
let c4FindingsCount = c4findings.reduce((acc, it) => acc + it.findings.length, 0)
Logger.info(`Got ${c4FindingsCount} findings for ${c4findings.length} c4 contests`)