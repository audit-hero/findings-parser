import { E, pipe } from "ti-fptsu/lib";
import { convertToFinding } from "./pg-to-finding.js";
import { Severity } from "ah-shared";
export let getHmFindings = (md, contest) => pipe(getHmParagraphs(md), E.chain((it) => E.traverseArray(getFindingParagraphs)(it)), E.map((hmParagraphs) => hmParagraphs
    .map((hmParagraph) => hmParagraph.findings.map((finding) => ({
    severity: hmParagraph.severity,
    finding,
    contest,
})))
    .flat()), E.chain(E.traverseArray(convertToFinding)), E.map((it) => it), E.mapLeft((it) => new Error(it)));
let getHmParagraphs = (md) => pipe(md.match(/^#{1,4}.*(high|medium)/gim), E.fromNullable("No headings found"), E.chain((it) => (it.length === 2 ? E.right(it) : E.left("Should have 2 headings"))), 
// 2 string paragraphs from the regex
E.map((it) => {
    const firstMatchIndex = md.indexOf(it[0]);
    const secondMatchIndex = md.indexOf(it[1]);
    const firstParagraph = md.substring(firstMatchIndex, secondMatchIndex).trim();
    const secondParagraph = md.substring(secondMatchIndex).trim();
    return [firstParagraph, secondParagraph];
}));
let getFindingParagraphs = (hmParagraph) => pipe(hmParagraph.match(/^#{1,4}.*(high|medium)/i), E.fromNullable("Not a HM paragraph"), E.map(() => {
    const regex = /^\s+(\d+\.\d+\.\d+|\*\*\d+\.\d+\.\d+\*\*)/gm;
    let match;
    const matches = [];
    while ((match = regex.exec(hmParagraph)) !== null) {
        matches.push({ match: match[0], index: match.index });
    }
    return matches;
}), E.chain((it) => E.fromNullable("No findings")(it)), E.map((matches) => getFindingParagraphsFromMatches(hmParagraph, matches)
    .map(fixLineBreaks)
    .map(removeAdminComments)
    .map(convertImportantPgToHeadings)
    .map(removeMoreThanDoubleEmptyLines)), E.map((it) => ({
    severity: hmParagraph.match(/^#{1,4}.*(high)/im) ? Severity.HIGH : Severity.MEDIUM,
    findings: it,
})));
let getFindingParagraphsFromMatches = (hmParagraph, matches) => {
    const paragraphs = [];
    for (let i = 0; i < matches.length; i++) {
        const { index } = matches[i];
        let end = i === matches.length - 1 ? hmParagraph.length : matches[i + 1].index;
        let paragraph = hmParagraph.substring(index, end).trim();
        paragraphs.push(paragraph);
    }
    return paragraphs;
};
// prettier-ignore
export let fixLineBreaks = (paragraph) => paragraph
    .replace(/(?<!^)(\s)(\w)+:\s/gm, '\n\n$&')
    .replace(/(?<!^)(\s)\*\*(\w|\s)+:\*\*\s/gm, '\n\n$&')
    .replace(/\n[^\S\r\n]+/g, '\n');
// \n**Babylon:** Fixed in staking-indexer PR 124."
// eg /remove ^**.*:**.*(fixed|solved|will not)/gmi
export let removeAdminComments = (paragraph) => paragraph.replace(/\n\*\*.*:\*\*.*(fixed|solved|will not).*\n?/gi, "");
export let convertImportantPgToHeadings = (paragraph) => paragraph.replace(/^(\*\*|)(Description|Impact|Recommendation|Proof of concept|PoC):(\*\*|)(\s+|)/gim, "## $2\n\n");
let removeMoreThanDoubleEmptyLines = (paragraph) => paragraph.replaceAll(/\n{2,}/gm, "\n");
//# sourceMappingURL=parse-md.js.map