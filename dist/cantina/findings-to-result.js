import { pipe } from "ti-fptsu/lib";
import { trimContestName } from "../trim-contest-name.js";
import { withTagsAndName } from "../util.js";
import { getAnyDateUTCTimestamp } from "../any-date.js";
export let findingsToResults = (findings) => findings.map((it) => {
    let contest = getContest(it);
    let findings = it.findings.map(withTagsAndName);
    return { contest, findings };
});
// prettier-ignore
let getContest = ({ comp }) => pipe(getAnyDateUTCTimestamp(comp.timeline.start), (date) => ({
    c_name: trimContestName(comp.title, date),
    c_platform: "cantina",
    c_date: date,
    c_add_date: date,
    c_url: `https://cantina.xyz/portfolio/${comp.id}`,
}));
export let trimCantinaContestName = (comp) => pipe(getAnyDateUTCTimestamp(comp.timeline.start), (date) => trimContestName(comp.title, date));
//# sourceMappingURL=findings-to-result.js.map