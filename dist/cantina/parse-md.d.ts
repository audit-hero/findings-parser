import { E } from "ti-fptsu/lib";
import { CantinaCompetitionsEntity } from "./types.js";
import { CantinaParseResult } from "./get-findings.js";
export declare let getHmFindings: (md: string, contest: CantinaCompetitionsEntity) => E.Either<Error, CantinaParseResult>;
export declare let fixLineBreaks: (paragraph: string) => string;
export declare let removeAdminComments: (paragraph: string) => string;
export declare let convertImportantPgToHeadings: (paragraph: string) => string;
