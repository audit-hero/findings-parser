import { getTitleItems } from "./c4FindingsParser.util.js";
import { it, expect } from "vitest";
let title = `## [[H-01] [WP-H5] \`L1Migrator.sol#migrateETH()\` does not send \`bridgeMinter\`'s ETH to L2 causing ETH get frozen in the contract](https://github.com/code-423n4/2022-01-livepeer-findings/issues/205)`;
it('should parse title', () => {
    let it = getTitleItems(title);
    expect(it.name).toEqual(`\`L1Migrator.sol#migrateETH()\` does not send \`bridgeMinter\`'s ETH to L2 causing ETH get frozen in the contract`);
});
it("should parse title 2", () => {
    let title = `## [L-01] \`PaladinRewardReserve\` 's approvals break if the same contract is in charge of two tokens (e.g. a [PalPool](https://doc.paladin.vote/paladin-protocol/palpool))`;
    let it = getTitleItems(title);
    expect(it.name).toEqual(`\`PaladinRewardReserve\` 's approvals break if the same contract is in charge of two tokens (e.g. a PalPool)`);
});
it("should parse title 3", () => {
    let title = `## [[M-16] function changeController() has rug potential as admin can unilaterally withdraw all user funds from both risk and insure vaults](https://github.com/code-423n4/2022-09-y2k-finance-findings/issues/269)`;
    let it = getTitleItems(title);
});
it("should parse title 4", () => {
    let title = `## [17]] Large multiples of ten should use scientific notation`;
    let it = getTitleItems(title);
});
//# sourceMappingURL=c4FindingsParser.test.js.map