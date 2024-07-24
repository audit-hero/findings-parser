import { GithubContest } from "./types.js"
import fs from "fs"

export type CacheType = "c4Contests" | "sherlockContests"
let useCache = true && !process.env.AWS_LAMBDA_FUNCTION_NAME

export let getCached = (type: CacheType): GithubContest[] | undefined =>
  useCache && fs.existsSync(`cache/${type}.json`)
    ? JSON.parse(fs.readFileSync(`cache/${type}.json`, "utf-8"))
    : undefined

export let writeCache = (type: CacheType, contests: GithubContest[]) => {
  if (!useCache) return
  if (fs.existsSync("cache") == false) fs.mkdirSync("cache")
  fs.writeFileSync(`cache/${type}.json`, JSON.stringify(contests))
}
