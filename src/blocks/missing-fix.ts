/*
This script fix the blocks_missing pool fetching their blocks from the nis and saving it
*/
var nis = require('../core/niswrap');
var mongo = require('../core/mongowrap');
var assert = require('assert');

// Connect DB
mongo.connect(function(err, client) {

  // maps collections
  mongo.c.blocks_missing.find({}).limit(25).toArray((err, mbs)=>{

    if (mbs.length == 0){
      console.log("No blocks to fix.");
      mongo.close();
    }

    mbs.forEach( mb => {
      // Fetches the next block from NIS
      nis.getBlockByHeight(mb.height).subscribe(block => {
        console.log("getBlock", block.height);
        // Insert the block to the db
        mongo.c.blocks.insertOne(block, function(insBlockErr, r) {
          assert.equal(null, insBlockErr);
          assert.equal(1, r.insertedCount);
          console.log("Block "+block.height+" fixed!");
          mongo.c.blocks_missing.remove(mb);
        });

      }, err => {
        console.log("Error fetching block!");
        // mongo.close()
      });
      
    });

  });


});
