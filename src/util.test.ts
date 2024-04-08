import { it, expect, vi } from "vitest"
import { GithubContest } from "./types.js"
import { downloadReadme } from "./util.js"
import fs from "fs"

it("should use cache", async () => {
  fs.rmSync("./.cache/", { recursive: true })
  let contest: GithubContest = {
    repo: {
      url: "repoUrl",
    },
    name: "test",
  } as any

  let fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        content: Buffer.from("readme content").toString("base64"),
      }),
  })
  global.fetch = fetch

  let readme = await downloadReadme(contest, "path", () => {}, true)
  expect(fetch).toBeCalledTimes(1)
  expect(readme).toBe("readme content")

  let readmeCached = await downloadReadme(contest, "path", () => {}, true)

  expect(fetch).toBeCalledTimes(1)
  expect(readmeCached).toBe("readme content")

  vi.clearAllMocks()
})
