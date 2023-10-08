import { Finding, Platform, Repo } from "ah-shared";

// in backend we always have content. In frontend we load it lazily
export type FindingStorage = Finding & { content: string }

export type ParseResult = {
  contest: FindingsContest;
  findings: FindingStorage[];
}

export type GithubContest = { repo: Repo, platform: Platform, name: string, createDate: number, addDate: number, id: number }

export type FindingsContestsIndexContest = { c_name: string, c_platform: Platform, c_date: number, c_add_date: number, c_embs_s?: Set<string> }

// additional contest fields for the finding rows
export type FindingsContest = FindingsContestsIndexContest & {
  c_url: string // contest findings url
}

export type Result2<T> = { ok: true, value: T } | { ok: false, error: string }