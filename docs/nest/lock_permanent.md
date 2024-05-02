# `lockPermanent` and `unlockPermanent` Functional Overview
## `lockPermanent` 
The `lockPermanent` function allows a user to convert their existing lock on tokens into a permanent lock. This is typically used in scenarios where a user wants to commit their tokens indefinitely to the system, either for increased voting power, influence, or to participate in long-term governance.

### **Key Characteristics:**
* **Permanent Locking:** Once tokens are locked permanently, they cannot be unlocked until the `unlockPermanent` function is invoked by the user.
* **Token Requirements:** The user must have already locked tokens, and the lock must not have expired.
* **Lock Expiry Check:** The function checks if the existing lock has not expired, ensuring that only valid locks can be made permanent.


## `unlockPermanent ` 
The `unlockPermanent` function allows a user to remove the permanent lock from their tokens, thereby converting them back to a standard lock with a specified expiry. This function is used when a user decides to withdraw their long-term commitment or needs to reallocate their tokens elsewhere.
**After unlocking, the token will be blocked for the maximum possible period (182 days)**
Key Characteristics:

* **Unlocking Permanently Locked Tokens**: Only tokens that have been permanently locked can be unlocked using this function.
* **Voting Check**: Tokens that have been used for voting cannot be unlocked until they are abstained or voting is concluded.
* **End of Lock Adjustments**: The lock end is adjusted to the maximum allowable lock duration from the current time, effectively re-establishing a normal lock.

**How to Use These Functions:**
1.** Locking Tokens Permanently:**
  * Ensure you have an existing lock with tokens that haven't expired.
  * Call `VotingEscrow.lockPermanent(tokenId)` where tokenId is the ID of the token whose lock you want to make permanent.
  * This will permanently lock the tokens, removing the ability to unlock them until you decide to call `unlockPermanent`.
2. **Unlocking Permanently Locked Tokens:**
   * Ensure your tokens are permanently locked and have not been used in an ongoing vote.
   * Call `VotingEscrow.unlockPermanent(tokenId)` to remove the permanent lock and set a new maximum allowable lock duration.
   * This restores the ability to unlock tokens normally at the end of the new lock period.
