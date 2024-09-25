import anyDateParser from "any-date-parser";
import { Logger } from "jst-logger";
export const getAnyDateUTCTimestamp = (someStringDate) => {
    try {
        let anyDate = anyDateParser.attempt(someStringDate);
        // August 21, 2023
        if (anyDate.year === undefined)
            anyDate.year = new Date().getFullYear();
        if (anyDate.month === undefined || anyDate.day === undefined)
            throw new Error("invalid anydate");
        var someDate = Date.UTC(anyDate.year, anyDate.month - 1, anyDate.day, anyDate.hour ?? 0, anyDate.minute ?? 0, anyDate.second ?? 0);
        return someDate / 1000;
    }
    catch (e) {
        let jsTimestamp = getJsDateTimestamp(someStringDate);
        if (!jsTimestamp) {
            Logger.error(`error cannot get timesetamp ${someStringDate} ${e}`);
        }
        return jsTimestamp;
    }
};
export const getJsDateTimestamp = (someStringDate) => {
    let date = new Date(someStringDate);
    let currentYear = new Date().getFullYear();
    // if year more than 1 away
    if (Math.abs(date.getFullYear() - currentYear) > 1) {
        date = new Date(date.setFullYear(currentYear));
    }
    return date.getTime() / 1000;
};
//# sourceMappingURL=any-date.js.map