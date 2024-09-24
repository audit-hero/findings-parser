import { pipe, E } from "ti-fptsu/lib";
// get pk, name, content, url (contest page), severity, tags,
export let convertToFinding = (input) => pipe(E.Do, E.apS("name", E.of(getName(input))), E.apS("content", E.of(getContent(input))), E.apS("url", E.of(getUrl(input))), E.apS("severity", E.of(input.severity)), E.apS("tags", E.of(["none"])), E.apS("pk", E.of("")), E.apS("platform", E.of("cantina")));
let getName = (input) => {
    let { finding } = input;
    return finding
        .split(/^(\*\*|)\d+\.\d+\.\d+(\*\*|) /)[3]
        .split("\n")[0]
        .trim();
};
let getContent = (input) => {
    let { finding } = input;
    return finding
        .split(/^(\*\*|)\d+\.\d+\.\d+(\*\*|) /)[3]
        .split("\n")
        .slice(1)
        .join("\n")
        .trim();
};
let getUrl = (input) => {
    let { contest } = input;
    return `https://cantina.xyz/competition/${contest.id}`;
};
//# sourceMappingURL=pg-to-finding.js.map