/*
This script finds all the missing blocks in the range of the network blocks_service limits
and inserts into blocks_missing collection to be processed by blocks-missing-fix script
*/
// var nis = require('../core/niswrap');
var mongo = require('../core/mongowrap');
var assert = require('assert');
var args = require('optimist').argv;

var firstBlock = 0, lastBlock = 0;

// Connect DB
mongo.connect(function(err, client) {

  // empties blocks_missing before start
  mongo.c.blocks_missing.remove({},(err,res)=>{
    mongo.findBlocksService(false, (err, bs) => {
      firstBlock = args.first || args.start || bs.blocks.first;
      lastBlock = args.last || args.end || bs.blocks.last;

      for(let h = firstBlock; h <= lastBlock; h++){
        console.log("block height:", h);
        mongo.findBlockByHeight(h, (err, blk) => {
          if (blk === null){
            console.log("MISSING BLOCK", h);
            mongo.c.blocks_missing.insertOne({height:h});
          } 
          else {
            console.log("found "+blk.height);
          }
        });
      }

    });

  });

});