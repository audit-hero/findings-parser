import { expect, it } from "vitest";
import fs from "fs";
import { getHmFindings } from "./parse-md.js";
import { E, pipe } from "ti-fptsu/lib";
export let comp = {
    id: "1",
    name: "Bitcoin Staking",
    pdfLink: "https://cantina.xyz/competition/1",
};
it("should get cantina findings", async () => {
    let pdf = fs.readFileSync("./src/cantina/fixtures/opendoc/bitcoin-staking.md", "utf-8");
    let comp = {
        id: "1",
        name: "Bitcoin Staking",
        pdfLink: "https://cantina.xyz/competition/1",
    };
    pipe(getHmFindings(pdf, comp), E.map((findings) => {
        expect(findings.length).toBe(15);
    }));
});
//# sourceMappingURL=cantinaFp.test.js.map