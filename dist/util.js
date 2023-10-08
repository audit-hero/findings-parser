import { ALL_TAGS } from "ah-shared";
import { githubParams, parserConfig } from "./config.js";
export const getPushTimestamp = (timestamp) => Math.floor(new Date(timestamp).getTime() / 1000);
export const withTagsAndName = (finding) => {
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
export const getFindings = async (getContests, downloadReadme, parse) => {
    let contests = await getContests();
    let readmes = await Promise.all(contests.map(c => downloadReadme(c)));
    let findings = readmes.map((r, i) => {
        if (!r)
            return undefined;
        return parse(contests[i], r);
    }).filter(it => it !== undefined);
    return findings;
};
export const downloadReadme = async (contest, path, errorLog) => {
    let repo = contest.repo;
    let readme = await fetch(`${repo.url}/${path}`, githubParams)
        .then(async (it) => {
        let json = await it.json();
        if (json.message !== undefined) {
            errorLog(`${contest.platform} readme download error for contest ${contest.name}(${repo.url})\n${json.message}`);
            return undefined;
        }
        return Buffer.from(json.content, "base64").toString();
    })
        .catch(e => {
        errorLog(`${contest.platform} readme download error for contest ${contest.name}(${repo.url})\n${e}`);
        return undefined;
    });
    return readme;
};
//# sourceMappingURL=util.js.map