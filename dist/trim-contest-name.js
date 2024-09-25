import { toLowerCase } from "fp-ts/lib/string.js";
import { pipe } from "ti-fptsu/lib";
export let trimContestName = (name, startDate) => pipe(replaceNonTextCharacters(name), addYearAndMonthToContestName(startDate), toLowerCase, truncateLongContestName);
export let addYearAndMonthToContestName = (startDate) => (name) => {
    if (name.match(/^\d{4}-\d{2}-/))
        return name;
    let startYear = new Date(startDate * 1000).getFullYear();
    let startMonth = new Date(startDate * 1000).getMonth() + 1;
    return `${startYear}-${startMonth.toString().padStart(2, "0")}-${name}`;
};
export let replaceNonTextCharacters = (contestName) => {
    return contestName
        .replace(/[^a-zA-Z0-9-]/g, "") // replace all non-alphanumeric characters with ""
        .replace(/-{2,4}/g, "-"); // replace all multiple dashes with single dash
};
export let truncateLongContestName = (name) => {
    // cohere table starts with `ah-00000000-3a7b-` 17 characters.
    // max length is 64, so 47 characters left
    let maxLength = 47;
    let trimmedSlug = name;
    if (trimmedSlug.length > maxLength) {
        trimmedSlug = name.slice(0, maxLength);
        for (let i = 1; i < 10; i++) {
            if (name[maxLength - 1 - i] == "-") {
                trimmedSlug = name.slice(0, maxLength - 1 - i);
                break;
            }
        }
    }
    return trimmedSlug;
};
//# sourceMappingURL=trim-contest-name.js.map