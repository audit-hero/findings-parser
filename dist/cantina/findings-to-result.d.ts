import { ParseResult } from "../types.js";
import { CantinaParseResult } from "./get-findings.js";
import { CantinaCompetitionsEntity } from "./types.js";
export declare let findingsToResults: (findings: CantinaParseResult[]) => ParseResult[];
export declare let trimCantinaContestName: (comp: CantinaCompetitionsEntity) => string;
