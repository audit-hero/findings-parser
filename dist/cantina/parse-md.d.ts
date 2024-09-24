import { E } from "ti-fptsu/lib";
import { FindingStorage } from "../types.js";
import { CantinaCompetitionsEntity } from "./types.js";
export declare let getHmFindings: (md: string, contest: CantinaCompetitionsEntity) => E.Either<Error, FindingStorage[]>;
export declare let fixLineBreaks: (paragraph: string) => string;
export declare let removeAdminComments: (paragraph: string) => string;
export declare let convertImportantPgToHeadings: (paragraph: string) => string;
