import { E } from "ti-fptsu/lib";
import { FindingStorage } from "../types.js";
import { CantinaCompetitionsEntity } from "./types.js";
import { Severity } from "ah-shared";
type Input = {
    severity: Severity;
    finding: string;
    contest: CantinaCompetitionsEntity;
};
export declare let convertToFinding: (input: Input) => E.Either<string, FindingStorage>;
export {};
