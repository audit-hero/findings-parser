import { FindingStorage, GithubContest, ParseResult } from "./types.js";
export declare const getPushTimestamp: (timestamp: string) => number;
export declare const withTagsAndName: (finding: FindingStorage) => FindingStorage;
export declare const getFindings: (getContests: () => Promise<GithubContest[]>, downloadReadme: (contest: GithubContest) => Promise<string | void>, parse: (contest: GithubContest, readme: string) => ParseResult) => Promise<ParseResult[]>;
