import { GithubContest } from "./types.js";
export type CacheType = "c4Contests" | "sherlockContests";
export declare let getCached: (type: CacheType) => GithubContest[] | undefined;
export declare let writeCache: (type: CacheType, contests: GithubContest[]) => void;
