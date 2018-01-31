/**
 This script listen for new blocks and adds them to the database
 */
var nis = require('../core/niswrap');
var mongo = require('../core/mongowrap');
var assert = require('assert');
var blocksNetwork = require('../app/config').network;

var insertBlock = true;

console.log("Wait, listening for new blocks...");

nis.blockchainListener.newBlock().subscribe( newBlock => {
    console.log("New block: "+newBlock.height);
    console.log(newBlock);

    // Connect DB
    mongo.connect((err, client) => {
        
        // try finding the nextBlock on the database
        mongo.findBlockByHeight(newBlock.height, function(err, mongoBlock){
            // if exists, stop the script
            if (mongoBlock !== null) {
                console.log("Block already exists!", mongoBlock);
                mongo.close();
                return;
            } else { // if not, then fetch and insert the block
                
                // Insert the block to the db
                if (!insertBlock) return;

                mongo.c.blocks.insertOne(newBlock, function(err, r) {
                    assert.equal(null, err);
                    assert.equal(1, r.insertedCount);
                    console.log("Block "+newBlock.height+" inserted!");
                    let updateValues = {'blocks.last': newBlock.height};
                    
                    // Updates the chain service with the last block handled
                    mongo.c.blocks_service.updateOne({network:blocksNetwork}, {$set: updateValues}, {
                        upsert: true
                    }, function(updateChainErr, r) {
                        assert.equal(null, updateChainErr);
                        console.log("Next block: "+newBlock.height+1);
                        mongo.close();
                    });
                });
            
            }

        });

    });

}, err => {
    console.log("Error connecting to NIS!");
    console.log(err);
});