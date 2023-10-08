export let parserConfig = {
  dontIncludeJudgeComments: true,
  dontParseTags: true
}

export const setParserConfig = (config: typeof parserConfig) => {
  parserConfig = config
}

export const githubParams = {
  method: "GET",
  headers: {
    "Accept": "application/vnd.github+json",
    "Authorization": "token " + process.env.GITHUB_ACCESS_TOKEN!
  }
}