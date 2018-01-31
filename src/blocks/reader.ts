/*
This script reads the blockchain, block by block and inserts it into MongoDB
either going forward or backwards on block height
*/
var nis = require('../core/niswrap');
var mongo = require('../core/mongowrap');
var assert = require('assert');
var args = require('optimist').argv;
var blocksNetwork = require('../app/config').network;

// If the service must read the blocks before firstBlock, counting downwards, set reverseMode = true;
var reverseMode = false;
if (args.r || args.reversed) reverseMode = true;

// Connect DB
mongo.connect(function(err, client) {

  // gets the blocks_service configuration
  mongo.findBlocksService(blocksNetwork, function(err, blockServ){
    let nextBlock = blockServ.blocks.last+1;
    if (reverseMode)
      nextBlock = blockServ.blocks.first-1;
    // try finding the nextBlock on the database
    mongo.findBlockByHeight(nextBlock, function(err, mongoBlock){
      
      // if exists, stop the script
      if (mongoBlock !== null) {  
        console.log("BLOCK ALREADY EXISTS!", mongoBlock);
        console.log("========================================");
        mongo.close();
      } 
      else { // if not, then fetch and insert the block
        
        // Fetches the next block from NIS
        nis.getBlockByHeight(nextBlock).subscribe(block => {
          console.log("getBlock", block);

          // Insert the block to the db
          mongo.c.blocks.insertOne(block, function(err, result) {
            assert.equal(null, err);
            assert.equal(1, result.insertedCount);
            console.log("Block "+nextBlock+" inserted!");

            let updateValues;
            updateValues = {'blocks.last': nextBlock};
            if (reverseMode)
              updateValues = {'blocks.first': nextBlock};
            
            // Updates the chain service with the last block handled
            mongo.c.blocks_service.updateOne({network:blocksNetwork}, {$set: updateValues}, {
              upsert: true
            }, function(updErr, result) {
              assert.equal(null, updErr);

              let nextBlockNumber = (nextBlock+1);
              if (reverseMode)
                nextBlockNumber = (nextBlock-1);

              console.log("Next block: "+nextBlockNumber);
              mongo.close();
            });
          });
         
        },

        err => {
          console.log("Error fetching block!");
          mongo.close()
        });
      }

    });
  });
});