import { Logger } from "jst-logger";
import { setParserConfig } from "./config.js";
import { getCantinaFindings } from "./cantina/get-findings.js";
import { setPlaywrightConfig } from "./web-load/playwright-loader.js";
import playwright from "playwright";
import fs from "fs";
import YAML from "yaml";
setParserConfig({ dontIncludeJudgeComments: true, dontParseTags: false });
// let sherlockFindings = await getFindings(
//   getSherlockContests,
//   downloadSherlockReadme,
//   parseSherlockFindings,
// )
// let sherlockFindingsCount = sherlockFindings.reduce((acc, it) => acc + it.findings.length, 0)
// Logger.info(
//   () => `Got ${sherlockFindingsCount} findings for ${sherlockFindings.length} sherlock contests`,
// )
// let c4findings = await getFindings(getC4Contests, downloadC4Readme, parseC4Findings)
// let c4FindingsCount = c4findings.reduce((acc, it) => acc + it.findings.length, 0)
// Logger.info(() =>`Got ${c4FindingsCount} findings for ${c4findings.length} c4 contests`)
setPlaywrightConfig({
    wait: 1000,
    browser: (await playwright.chromium.launch({ headless: true })),
});
await getCantinaFindings().then((findings) => {
    fs.writeFileSync("result.md", YAML.stringify(findings));
    Logger.info(() => `Got ${findings.length} findings for ${findings.length} cantina contests`);
});
//# sourceMappingURL=index.run.js.map