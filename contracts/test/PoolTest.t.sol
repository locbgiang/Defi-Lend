// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {Test} from "forge-std/Test.sol";
import {Pool} from "../src/contracts/protocol/pool/Pool.sol";
import {AToken} from "../src/contracts/tokenization/AToken.sol";
import {VariableDebtToken} from "../src/contracts/protocol/tokenization/VariableDebtToken.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract PoolTest is Test {
    Pool public pool;
    MockERC20 public usdc;
    MockERC20 public dai;
    AToken public aUSDC;
    AToken public aDAI;
    VariableDebtToken public vdUSDC;
    VariableDebtToken public vdDAI;

    address public addressesProvider = address(0x1);
    address public treasury = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);

    // events (copy from Pool.sol)
    event ReserveInitialized(
        address indexed asset,
        address indexed aToken,
        address indexed variableDebtToken,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    );

    function setUp() public {
        // deploy pool
        pool = new Pool(addressesProvider, treasury);

        // deploy mock tokens
        usdc = new MockERC20("USD Coin", "USDC");
        dai = new MockERC20("Dai Stablecoin", "DAI");

        // deploy aTokens
        aUSDC = new AToken(
            address(pool),
            address(usdc),
            treasury,
            "Aave USDC",
            "aUSDC"
        );

        aDAI = new AToken(
            address(pool),
            address(dai),
            treasury,
            "Aave DAI",
            "aDAI"
        )
    }
}