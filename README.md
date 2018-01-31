# NEM SuperNode CrowdFunding System

This system is an autonomous NEM account that manages the crowdfunding of NEM supernodes.
This project was made for the NEM Global Hackaton 2018.

## Interacting with the system

Access [NEM Supernodes Crowdfunding](http://nemsupernodes.com) website to use this application.

## Installation

1. Clone this repo
2. Run: npm install
3. Rename file src/app/config.ts.bkp to src/app/config.ts
4. Edit src/app/config.ts:
    1. Configure the network and active supernode variables
    2. Configure mongodb connection variables
    3. Configure app signature key variable
5. Run: tsc
6. Run: npm run mongo-install
7. Open your mongo blocks_service collection and set block.first and block.last to the same block number you want to start tracking
8. Open your mongo supernodes collection and set all variables of your supernode account

## Running the services

After compiling the code with the tsc command, you can run the following services on the ./scripts directory:

### bash blocks-reader
Reads every block and adds it to mongo db server. All transactions are analysed on the database, not relying on sockets incoming transactions for now.

### bash payments-incoming
Analyses new blocks searching for incoming transactions for the supernode account, and creates payments or messages actions according to each transaction.

### bash payments-outgoing
Announces each payment to the supernode account, splits transactions if needed, control balances, locks and unlocks supernodes accounts.

### bash payments-confirmations
Confirms outgoing payments that were waiting to be signed.