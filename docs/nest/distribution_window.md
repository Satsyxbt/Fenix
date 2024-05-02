# Understanding the Distribution Window in the Voter Upgradeable Contract
## Overview
The Distribution Window in the Voter Upgradeable contract is a crucial mechanism designed to manage and synchronize voting and reward distribution within a decentralized platform. This window is specifically set to occur for one hour before the end of a period and one hour after, creating a controlled environment where voting is restricted to certain participants and reward distributions are prepared.


## Purpose of the Distribution Window
The main objectives of the Distribution Window are:

* **To stabilize the voting environment**: By preventing general voting during critical times when rewards are being calculated and distributed, the system ensures that all decisions are made based on stable and consistent data.
* **To allow specific actions by designated NFTs**: Special permissions are granted to specific managed NFTs during this window, allowing them to vote even when general voting is paused. This is often used to adjust strategies or manage urgent governance actions that are tied to these NFTs.
  
## Timing and Restrictions
1. Timing
   * **One hour before the end of a period**: This time is used to prepare for the closing of the current voting session. During this hour, general users are prevented from voting to ensure that the tallying of votes can be conducted on a consistent set of data.
   * **One hour after the end of a period**: After the period officially ends, this additional hour provides a buffer for executing reward distributions based on the votes cast during the period.
2. Restrictions
   * **General Voting**: Regular users cannot cast votes during the Distribution Window. This prevents changes in voting data that could affect the fairness and accuracy of reward calculations.
   * **Voting by Managed NFTs**: Specific NFTs, often with special roles or capabilities within the ecosystem, are allowed to vote during this window.
