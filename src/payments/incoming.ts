/*
This script searchs for incoming transactions to a supernode account
and prepares pending payments in XEM or XSN to be sent back to the senders account
*/
import { SupernodeModel } from '../app/models/SupernodeModel';
import { NEMBlockModel } from '../core/models/nem/NEMBlockModel';
import { NEMAccountModel } from '../core/models/nem/NEMAccountModel';
import { PaymentModel } from '../app/models/PaymentModel';

//
var config = require('../app/config');
var validator = require('validator');
var mongo = require('../core/mongowrap');
var nis = require('../core/niswrap');
var assert = require('assert');
var args = require('optimist').argv;

//
var debug = false;
var locked = false; // locks inserts and updates 
var limit = 100;

// Connect DB
mongo.connect(function(err, client) {

  // the highest block processed in sequence
  let highestBlock = 0;

  // gets the supernode configuration
  mongo.findSupernode(config.supernode.active, function(err, snData){
    assert.equal(null, err);

    let supernode = new SupernodeModel(snData);
    supernode.dieIfInactive();

    // searches for all incoming transactions, from the last processed blocks,
    // that has transactions sent to the supernode account address
    let blocksArgs = supernode.incomingBlocksQuery();
    
    // get all incoming transactions to the supernode account, since the last income processed block
    let outgoingPayments = [];

    // get the blocks with incoming transactions to be processed
    mongo.c.blocks
    .find(blocksArgs,{sort: 'height'})
    .limit(limit)
    .toArray((err, result) => {
      assert.equal(null, err);
      
      if (result.length == 0) {
        console.log("No incoming payments to process!");
        mongo.close();
        return;
      }

          console.log("SUPERNODE ACCOUNT", supernode.address);

          // for each block with transactions
          result.forEach( blkData => {

            let block = new NEMBlockModel(blkData);
            if (highestBlock < block.height) highestBlock = block.height;
            console.log("=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-");
            console.log("BLOCK", block.height);
            console.log("=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-");
            
            // gets only the transactions to this supernode recipient
            let txs = block.filterTxByRecipient(supernode.address);

            txs = supernode.removeAuthorizedSigners(txs);

            // If there are still transactions left
            if (txs.length > 0){

              txs.forEach( tx => {
                
                // creates a payment model to prepare payment
                let pay = new PaymentModel();
                pay.init(tx, block.height);
              

                // If has XEM, send XSN
                if (pay.tx.hasXem) {
                  pay = supernode.prepareSendXSN(pay);
                  if (pay.isPrepared){
                    outgoingPayments.push(pay.data);
                  }
                }


                // If has XSN, send XEM
                if (pay.tx.hasMosaic(supernode.mosaicId)) {
                  let pay2 = new PaymentModel();
                  pay2.init(tx, block.height);
                  pay2 = supernode.prepareSendXEM(pay2);
                  if (pay2.isPrepared){
                    outgoingPayments.push(pay2.data);
                  }
                }


                // Process messages on the transaction
                let message, email = '';
                //
                if (pay.tx.hasMessage) {

                  // read or decrypt the message
                  if (pay.tx.isMessageEncrypted){
                    message = pay.tx.decryptedMessage(supernode.privateKey);
                  } else {
                    message = pay.tx.messageText;
                  }

                  // claim representative candidate
                  if (["representative-candidate:in","claim-representative","claim","representative","candidate"].indexOf(message) > -1){
                    supernode.addRepresentativeCandidate(pay.tx.signer);
                    console.log("Representative claiming inserted: ", pay.tx.signer);
                  }

                  // unclaim representative candidate
                  else if (["representative-candidate:out","unclaim-representative","unclaim","remove","remove-candidate","remove-claim"].indexOf(message) > -1){
                    supernode.removeRepresentativeCandidate(pay.tx.signer);
                    console.log("Representative claiming removed: ", pay.tx.signer);
                  }

                  // TODO: remove email
                  else if (["email:out","email:optout","optout","opt-out","email:opt-out"].indexOf(message) > -1){
                    supernode.removeAccountEmail(pay.tx.signer);
                    console.log("Account e-mail removed: ", pay.tx.signer);
                  }

                  // register account email
                  else if (validator.isEmail(message)){
                    email = message;
                    console.log("Account e-mail inserted: ", message, pay.tx.signer);
                  }
                }

                // adds signer and email on supernode
                supernode.addAccount(pay.tx.signer, email);
                
              });

            }

          });
          



          if (outgoingPayments.length > 0){

            if (!locked && !args.noinsert){

              // inserts all outgoing payments as pending payments
              mongo.c.payments.insertMany(outgoingPayments, (err, res)=>{

                console.log("Incoming pending payments inserted!");
                if (!args.noupdate){
                  supernode.updateIncomingBlock(highestBlock, (err, result) => {
                    console.log("Last incoming block updated: "+highestBlock);
                    supernode.saveResources((err, result) => {
                      console.log("Supernode resources updated!");
                      mongo.close();
                    });
                  });
                } else {
                  console.log("Last block not updated!");
                  mongo.close();
                }
              });

            } else {
              mongo.close();
            }

          } else {

            if (!locked && !args.noupdate){
              supernode.updateIncomingBlock(highestBlock, (err, result) => {
                console.log("Last incoming block updated: "+highestBlock);
                supernode.saveResources((err, result) => {
                  console.log("Supernode resources updated!");
                  mongo.close();
                });
              });
            } else {
              mongo.close();
            }

          }

    }); // find mongo blocks

  }); // find mongo supernode

}); // connect mongo