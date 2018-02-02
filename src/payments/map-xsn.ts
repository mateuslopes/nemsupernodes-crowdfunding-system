/*
This script maps XSN owners all time
*/
import { SupernodeModel } from '../app/models/SupernodeModel';
import { NEMBlockModel } from '../core/models/nem/NEMBlockModel';
import { NEMTransactionModel } from '../core/models/nem/NEMTransactionModel';
import { NEMHelpers } from '../core/models/NEMHelpers';
//
var config = require('../app/config');
var mongo = require('../core/mongowrap');
var nis = require('../core/niswrap');
var assert = require('assert');

//
var debug = false;
var locked = false; // locks inserts and updates 

// Connect DB
mongo.connect(function(err, client) {

  // gets the supernode configuration
  mongo.findSupernode(config.supernode.active, function(err, snData){
    assert.equal(null, err);
    let supernode = new SupernodeModel(snData);
    supernode.dieIfInactive();

    supernode.allMosaicTransactionsBlocks()
    .toArray((err,blocks)=>{
      assert.equal(null, err);
      
      if (blocks.length == 0){
        console.log("No blocks with mosaic transactions on "+supernode.nodeId+" supernode!");
        mongo.close();
        process.exit();
      }

      let accounts = [];
      var xsnOwners = new Map();
      let lastBlock = 0;
      let initialTransfer = 0;

      console.log("TOTAL BLOCKS FOUND:", blocks.length);
      blocks.forEach(blkData => {
        let block = new NEMBlockModel(blkData);
        lastBlock = block.height;
        
        let txs = block.filterTxByMosaic(supernode.mosaicId);
        
        if (txs.length > 0){
          txs.forEach(txData => {
            let tx = new NEMTransactionModel(txData);
            if (xsnOwners.size == 0){
              initialTransfer = NEMHelpers.roundXem(tx.mosaicQuantity(supernode.mosaicId));
              xsnOwners.set(tx.recipient.value, initialTransfer);
            } else {
              let senderAcc = xsnOwners.get(tx.signer.address.value);
              if (!xsnOwners.has(tx.recipient.value)) xsnOwners.set(tx.recipient.value, 0);
              let recipAcc = xsnOwners.get(tx.recipient.value);
              let qty = tx.mosaicQuantity(supernode.mosaicId);
              senderAcc -= qty;
              recipAcc += qty;
              xsnOwners.set(tx.signer.address.value, NEMHelpers.roundXem(senderAcc));
              xsnOwners.set(tx.recipient.value, NEMHelpers.roundXem(recipAcc));
            }

          });
        }

        
      });


      let sortable = [];
      xsnOwners.forEach((balance,account) => {
        sortable.push([account, balance]);
      });
      sortable.sort(function(a, b) {
          return b[1] - a[1];
      });
      let finalXsnOwners = [];
      sortable.forEach(acc => {
        finalXsnOwners.push({address: acc[0], balance: acc[1]});
      });

      
      console.log("MAPPED XSN ACCOUNTS BALANCES: ", sortable);
      console.log("=============================");
      
      
      // Just calculates the total balance to check if it matches with the starting balance
      let totalXsnAmount = 0;
      xsnOwners.forEach(aaccountBalance=>{
        // console.log("a",a);
        totalXsnAmount += aaccountBalance;
      });
      console.log("LAST BLOCK PROCESSED: ", lastBlock);
      console.log("INITIAL XSN TRANSFER: ", initialTransfer);
      console.log("TOTAL XSN HOLDED ON ACCOUNTS: ", NEMHelpers.roundXem(totalXsnAmount));

      // Saves the mapping and last block on supernodes model
      mongo.c.supernodes.updateOne({nodeId:supernode.nodeId}, {
        $set:{
          'xsnOwners.lastBlockMapped': lastBlock,
          'xsnOwners.accountsBalances': finalXsnOwners
        }
      }, {
          upsert: true
      }, function(err, result) {
          console.log("xsnOwners mapped to "+supernode.nodeId+" supernode!");
          mongo.close();
          process.exit();
      });

      
    });
    
  }); // find mongo supernode

}); // connect mongo