import { GithubContest, ParseResult } from "../types.js";
export declare function getC4Contests(): Promise<GithubContest[]>;
export declare const parseC4Findings: (contest: GithubContest, readme: string) => ParseResult;
export declare const downloadC4Readme: (contest: GithubContest, cache?: boolean) => Promise<string | undefined>;
