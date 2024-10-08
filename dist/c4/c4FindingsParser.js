import { Logger } from "jst-logger";
import { ALL_TAGS } from "ah-shared";
import { githubParams, parserConfig } from "../config.js";
import { downloadReadme, getPushTimestamp } from "../util.js";
import { getTitleItems } from "./c4FindingsParser.util.js";
import { getCached, writeCache } from "../cache.js";
export async function getC4Contests() {
    let cached = getCached("c4Contests");
    if (cached)
        return cached;
    // get repos which end with -findings and include report.md file
    var reposLength = 100;
    var reposBuilder = [];
    var page = 1;
    while (reposLength == 100) {
        let resp = await fetch(`https://api.github.com/orgs/code-423n4/repos?per_page=100&page=${page}`, githubParams);
        let repos = await resp.json();
        reposBuilder = reposBuilder.concat(repos.map((it) => {
            let timestamp = getPushTimestamp(it.created_at); // overwritten in contestResolver
            return {
                repo: it,
                platform: "c4",
                createDate: timestamp,
                addDate: timestamp,
                id: 0,
                name: it.name,
            };
        }));
        reposLength = repos.length;
        page++;
    }
    let repos = reposBuilder.filter((it) => it.repo.name.includes("-findings"));
    writeCache("c4Contests", repos);
    return repos;
}
export const parseC4Findings = (contest, readme) => {
    Logger.debug(`starting ${contest.repo.url}`);
    let findings = parse(readme);
    let findingContest = {
        c_name: contest.repo.name.replace("-findings", ""),
        c_date: contest.createDate,
        c_add_date: contest.addDate,
        c_url: contest.repo.url,
        c_platform: "c4",
    };
    return {
        contest: findingContest,
        findings,
    };
};
export const downloadC4Readme = async (contest, cache) => {
    let readme = await downloadReadme(contest, "contents/report.md", (msg) => Logger.warn(msg), cache ?? false);
    return readme;
};
const parse = (md) => {
    let lines = md.split("\n");
    let currentFinding = undefined;
    let findings = [];
    // create findings items
    let afterRecommended = false;
    let ignoringJudgeComments = false;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.startsWith("## [")) {
            if (currentFinding) {
                findings.push(withTagsAndName(currentFinding));
            }
            let titleItems = getTitleItems(line);
            currentFinding = {
                pk: "", // set when storing
                name: titleItems.name,
                content: "",
                url: titleItems.url,
                severity: titleItems.severity,
                tags: ["none"],
                platform: "c4",
            };
            afterRecommended = false;
            ignoringJudgeComments = false;
            continue;
        }
        else if (line.startsWith("# Medium") || line.startsWith("# Low")) {
            if (currentFinding) {
                findings.push(withTagsAndName(currentFinding));
                currentFinding = undefined;
            }
            continue;
        }
        else if (ignoringJudgeComments || line === "***")
            continue;
        else if (line.startsWith("# Gas")) {
            if (currentFinding) {
                findings.push(withTagsAndName(currentFinding));
                currentFinding = undefined;
            }
            break;
        }
        if (currentFinding) {
            // bold link with 'commented', 'confirmed' are judge comments
            if (parserConfig.dontIncludeJudgeComments &&
                line.match(/^\*\*\[.*( commented| confirmed| acknowledged).*\]/)) {
                ignoringJudgeComments = true;
            }
            else {
                currentFinding.content += `${line}\n`;
            }
        }
    }
    return findings;
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
//# sourceMappingURL=c4FindingsParser.js.map