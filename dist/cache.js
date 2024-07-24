import fs from "fs";
let useCache = true && !process.env.AWS_LAMBDA_FUNCTION_NAME;
export let getCached = (type) => useCache && fs.existsSync(`cache/${type}.json`)
    ? JSON.parse(fs.readFileSync(`cache/${type}.json`, "utf-8"))
    : undefined;
export let writeCache = (type, contests) => {
    if (!useCache)
        return;
    if (fs.existsSync("cache") == false)
        fs.mkdirSync("cache");
    fs.writeFileSync(`cache/${type}.json`, JSON.stringify(contests));
};
//# sourceMappingURL=cache.js.map