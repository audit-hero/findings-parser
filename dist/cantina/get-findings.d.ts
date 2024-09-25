import { FindingStorage, ParseResult } from "../types.js";
import { CantinaCompetitionsEntity } from "./types.js";
export type CantinaParseResult = PdfMd & {
    findings: FindingStorage[];
};
export type PdfMd = {
    comp: CantinaCompetitionsEntity;
    pdfMd: string;
};
export declare let getCantinaFindings: () => Promise<ParseResult[]>;
