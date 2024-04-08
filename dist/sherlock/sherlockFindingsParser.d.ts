import { FindingStorage, FindingsContest, GithubContest } from "../types.js";
export declare function getSherlockContests(): Promise<GithubContest[]>;
export declare const downloadSherlockReadme: (contest: GithubContest, cache?: boolean) => Promise<string | undefined>;
export declare const parseSherlockFindings: (contest: GithubContest, readme: string) => {
    contest: FindingsContest;
    findings: FindingStorage[];
};
