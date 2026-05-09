// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TransferMarketFactory} from "../src/TransferMarketFactory.sol";

contract Deploy is Script {
    function run() external {
        address deployer      = vm.envAddress("DEPLOYER_ADDRESS");
        address feeRecipient  = vm.envOr("FEE_RECIPIENT", deployer);

        vm.startBroadcast();

        TransferMarketFactory factory = new TransferMarketFactory(feeRecipient);
        console.log("TransferMarketFactory deployed:", address(factory));
        console.log("Fee recipient:", feeRecipient);
        console.log("Owner:", factory.owner());

        vm.stopBroadcast();
    }
}
