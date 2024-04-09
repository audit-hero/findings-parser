import Logger from "js-logger"
import { ALL_TAGS } from "ah-shared"
import { githubParams, parserConfig } from "../config.js"
import { Repo } from "ah-shared"
import { downloadReadme, getPushTimestamp } from "../util.js"
import {
  FindingStorage,
  FindingsContest,
  GithubContest,
  ParseResult,
} from "../types.js"
import { getTitleItems } from "./c4FindingsParser.util.js"
import fs from "fs"

export async function getC4Contests(): Promise<GithubContest[]> {
  // get repos which end with -findings and include report.md file
  var reposLength = 100
  var reposBuilder: GithubContest[] = []
  var page = 1
  while (reposLength == 100) {
    let resp = await fetch(
      `https://api.github.com/orgs/code-423n4/repos?per_page=100&page=${page}`,
      githubParams
    )
    let repos: Repo[] = await resp.json()

    reposBuilder = reposBuilder.concat(
      repos.map((it) => {
        let timestamp = getPushTimestamp(it.created_at) // overwritten in contestResolver
        return {
          repo: it,
          platform: "c4",
          createDate: timestamp,
          addDate: timestamp,
          id: 0,
          name: it.name,
        }
      })
    )

    reposLength = repos.length
    page++
  }

  let repos = reposBuilder.filter((it) => it.repo.name.includes("-findings"))
  return repos
}

export const parseC4Findings = (
  contest: GithubContest,
  readme: string
): ParseResult => {
  Logger.debug(`starting ${contest.repo.url}`)

  let findings = parse(readme)

  let findingContest: FindingsContest = {
    c_name: contest.repo.name.replace("-findings", ""),
    c_date: contest.createDate,
    c_add_date: contest.addDate,
    c_url: contest.repo.url,
    c_platform: "c4",
  }

  return {
    contest: findingContest,
    findings,
  }
}

export const downloadC4Readme = async (
  contest: GithubContest,
  cache?: boolean
) => {
  let readme = await downloadReadme(
    contest,
    "contents/report.md",
    (msg) => Logger.warn(msg),
    cache ?? false
  )

  return readme
}

const parse = (md: string) => {
  let lines = md.split("\n")
  let currentFinding: FindingStorage | undefined = undefined

  let findings: FindingStorage[] = []

  // create findings items
  let afterRecommended = false
  let ignoreJudgeComments = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    if (line.startsWith("## [")) {
      if (currentFinding) {
        findings.push(withTagsAndName(currentFinding))
      }

      let titleItems = getTitleItems(line)
      currentFinding = {
        pk: "", // set when storing
        name: titleItems.name,
        content: "",
        url: titleItems.url,
        severity: titleItems.severity,
        tags: ["none"],
        platform: "c4",
      }

      afterRecommended = false
      ignoreJudgeComments = false

      continue
    } else if (line.startsWith("# Medium") || line.startsWith("# Low")) {
      if (currentFinding) {
        findings.push(withTagsAndName(currentFinding))
        currentFinding = undefined
      }
      continue
    } else if (ignoreJudgeComments || line === "***") continue
    else if (line.startsWith("# Gas")) {
      if (currentFinding) {
        findings.push(withTagsAndName(currentFinding))
        currentFinding = undefined
      }
      break
    }

    if (currentFinding) {
      // bold link with 'commented', 'confirmed' seem to be judge comments
      if (
        parserConfig.dontIncludeJudgeComments &&
        line.match(/^\*\*\[.*( commented| confirmed| acknowledged)\]/)
      ) {
        ignoreJudgeComments = true
      } else {
        currentFinding.content += `${line}\n`
      }
    }
  }

  return findings
}

const withTagsAndName = (finding: FindingStorage) => {
  // get name from body if it doesnt exist
  if (!finding.name) finding.name = finding.content.slice(0, 60).trim()

  if (parserConfig.dontParseTags) return finding

  for (let i = 1; i < ALL_TAGS.length; ++i) {
    let tag = ALL_TAGS[i]
    if (
      finding.name.toLowerCase().includes(tag) ||
      finding.content.toLowerCase().includes(tag)
    ) {
      finding.tags?.push(tag)
    }
  }
  // remove "none" tag
  if (finding.tags.length > 1) finding.tags = finding.tags.slice(1)

  return finding
}
