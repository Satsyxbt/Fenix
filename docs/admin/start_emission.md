
### Starting the Emission Mechanism as an Owner

To initiate the emission process in the `MinterUpgradeable` contract, follow these steps:

#### Prerequisites
- You must be the owner of the contract, having the ability to execute owner-only functions.

#### Starting the Emission
 **Start the Emission:**
   Call the `start` function to begin the emission process. This function sets the `isStarted` flag to `true` and initializes the `active_period` to align with the weekly emission schedule.

```javascript
function start() external onlyOwner
```

#### Setting Parameters
**Configure Emission Rates:**
   Set the various parameters that influence the minting process:
   - `setTeamRate(uint256 _teamRate)`: Define the percentage of new tokens allocated to the team.
   - `setDecayRate(uint256 _decayRate)`: Set the rate at which the weekly emission amount decays.
   - `setInflationRate(uint256 _inflationRate)`: Specify the initial inflation rate for token emission.


#### Monitoring
**Check Emission Eligibility:**
The `check` function can be used to verify if the contract is eligible for an emission update based on the current time and the emission schedule.

```javascript
function check() external view returns (bool)
```

#### Notes
- The emission mechanism is designed to be executed on a weekly basis, aligning with the contract’s defined week.
- Make sure to review and adjust the emission parameters (`teamRate`, `decayRate`, `inflationRate`) as necessary to align with the project’s tokenomics and long-term strategy.
