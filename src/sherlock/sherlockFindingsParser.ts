import { Repo, Severity } from "ah-shared"
import { githubParams, parserConfig } from "../config.js"
import { FindingStorage, FindingsContest, GithubContest } from "../types.js"
import { downloadReadme, getPushTimestamp, withTagsAndName } from "../util.js"
import Logger from "js-logger"

export async function getSherlockContests(): Promise<GithubContest[]> {
  var reposLength = 100
  var reposBuilder: GithubContest[] = []
  var page = 1

  while (reposLength == 100) {
    let resp = await fetch(
      `https://api.github.com/orgs/sherlock-audit/repos?per_page=100&page=${page}`,
      githubParams
    )
    let repos: Repo[] = await resp.json()

    reposBuilder = reposBuilder.concat(
      repos.map((it) => {
        let timestamp = getPushTimestamp(it.created_at) // overwritten in contestResolver
        return {
          repo: it,
          platform: "sherlock",
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

  let repos = reposBuilder.filter((it) => it.repo.name.includes("-judging"))

  return repos
}

export const downloadSherlockReadme = async (
  contest: GithubContest,
  cache?: boolean
) => {
  let readme = await downloadReadme(
    contest,
    "contents/README.md",
    (msg) => Logger.warn(msg),
    cache ?? false
  )

  return readme
}

export const parseSherlockFindings = (
  contest: GithubContest,
  readme: string
) => {
  Logger.debug(`starting ${contest.repo.url}`)

  let findings: FindingStorage[] = []

  let builder: Partial<FindingStorage>
  let lines = readme.split("\n")

  const addFinding = (builder: Partial<FindingStorage>) => {
    if (builder) {
      let finding: FindingStorage = {
        ...(builder as Required<FindingStorage>),
        platform: "sherlock",
        tags: ["none"],
      }
      findings.push(withTagsAndName(finding))
    }
  }

  let ignoreJudgeComments = false
  lines.forEach((line, index) => {
    if (line.includes("# Issue ")) {
      addFinding(builder)

      let name = line.replace("# Issue ", "")
      if (name[3] == ":") name = name.slice(4).trim()
      if (name[4] == ":") name = name.slice(5).trim()

      builder = {
        content: "",
        name: name,
      }
      if (line.includes("M-")) {
        builder.severity = Severity.MEDIUM
      } else if (line.includes("H-")) {
        builder.severity = Severity.HIGH
      }

      ignoreJudgeComments = false
    } else {
      if ((builder.content?.length ?? 0) < 3 && line.startsWith("Source: ")) {
        builder.url = line.split("Source:")[1].trim()
      } else {
        if (
          parserConfig.dontIncludeJudgeComments &&
          line.startsWith("## Discussion")
        )
          ignoreJudgeComments = true

        if (!ignoreJudgeComments) builder.content += `${line}\n`
      }

      if (index == lines.length - 1) addFinding(builder)
    }
  })

  let findingContest: FindingsContest = {
    c_name: contest.repo.name.replace("-judging", ""),
    c_date: contest.createDate,
    c_add_date: contest.addDate,
    c_url: contest.repo.url,
    c_platform: "sherlock",
  }

  return {
    contest: findingContest,
    findings,
  }
}
