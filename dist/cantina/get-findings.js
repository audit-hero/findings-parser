import { Logger } from "jst-logger";
import { E, flow, pipe, TE } from "ti-fptsu/lib";
import { loadNextProps } from "../web-load/load-next-props.js";
import pdf2md from "@opendocsg/pdf2md";
import { log } from "ti-fptsu/log";
import { getHmFindings } from "./parse-md.js";
import { findingsToResults, trimCantinaContestName } from "./findings-to-result.js";
export let getCantinaFindings = async () => pipe(getNextProps(), log(() => "downloading pdfs"), TE.chain(downloadPdfs), TE.map((pdfs) => pdfs.filter((it) => it.pdfMd)), log(() => "parsing pdfs"), TE.chain((pdfs) => pipe(pdfs, E.traverseArray((pdf) => getHmFindings(pdf.pdfMd, pdf.comp)), TE.fromEither)), TE.map((it) => it.flat()), TE.map(findingsToResults), TE.getOrElse((e) => {
    throw e;
}))();
let getNextProps = () => TE.tryCatch(flow(() => "https://cantina.xyz/portfolio?section=cantina-competitions", loadNextProps), E.toError);
let downloadPdfs = (props) => pipe(props.cantinaCompetitions, TE.traverseArray((comp) => pipe(TE.fromTask(() => loadPdf(comp)), TE.map((pdfMd) => ({ comp, pdfMd })))), TE.map((it) => it));
const loadPdf = async (contest) => {
    Logger.debug(`loading pdf ${contest.pdfLink}`);
    if (contest.pdfLink.includes("cantina_competition_superform_erc115A_dec2023")) {
        console.log(` - skipping, because it's known to fail`);
        return undefined;
    }
    let file = await (await fetch(contest.pdfLink)).arrayBuffer();
    // @ts-ignore
    let md = await pdf2md(file)
        .then((text) => {
        return text;
    })
        .catch((err) => {
        console.error(`pdf2md failed for ${trimCantinaContestName(contest)}\n${err}`);
        return undefined;
    });
    return md;
};
//# sourceMappingURL=get-findings.js.map