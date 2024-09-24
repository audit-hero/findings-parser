import { Logger } from "jst-logger";
import { ALL_TAGS } from "ah-shared";
import { parserConfig } from "../config.js";
import { E, pipe, TE } from "ti-fptsu/lib";
import { loadNextProps } from "../web-load/load-next-props.js";
import pdf2md from "@opendocsg/pdf2md";
import { log } from "ti-fptsu/log";
import { getHmFindings } from "./parse-md.js";
export let getCantinaFindings = async () => pipe(getAllReports(), log(() => "downloading pdfs"), TE.chain(downloadPdfs), log(() => "parsing pdfs"), TE.chain((pdf) => pipe(pdf, E.traverseArray((pdf) => getHmFindings(pdf.pdfMd, pdf.comp)), TE.fromEither)), TE.map((it) => it.flat()), TE.getOrElse((e) => {
    throw e;
}))();
let getAllReports = () => TE.tryCatch(async () => {
    return (await loadNextProps("https://cantina.xyz/portfolio?section=cantina-competitions"));
}, E.toError);
let downloadPdfs = (props) => pipe(props.cantinaCompetitions, TE.traverseArray((comp) => pipe(TE.fromTask(() => loadPdf(comp)), TE.map((pdfMd) => ({ comp, pdfMd })))), TE.map((it) => it));
const loadPdf = async (contest) => {
    Logger.debug(`loading pdf ${contest.pdfLink}`);
    let file = await (await fetch(contest.pdfLink)).arrayBuffer();
    // @ts-ignore
    let md = await pdf2md(file)
        .then((text) => {
        return text;
    })
        .catch((err) => {
        console.error(err);
        return undefined;
    });
    return md;
};
const withTagsAndName = (finding) => {
    // get name from body if it doesnt exist
    if (!finding.name)
        finding.name = finding.content.slice(0, 60).trim();
    if (parserConfig.dontParseTags)
        return finding;
    for (let i = 1; i < ALL_TAGS.length; ++i) {
        let tag = ALL_TAGS[i];
        if (finding.name.toLowerCase().includes(tag) || finding.content.toLowerCase().includes(tag)) {
            finding.tags?.push(tag);
        }
    }
    // remove "none" tag
    if (finding.tags.length > 1)
        finding.tags = finding.tags.slice(1);
    return finding;
};
//# sourceMappingURL=cantinaFp.js.map