/*
This script fetches blocks from nis using command line arguments
--prev --first --last --next
-b [block number] | --block [block number]
*/
var nis = require('../core/niswrap');
var mongo = require('../core/mongowrap');
var args = require('optimist').argv;

var blockHeight = args.b || args.block || args.h || args.height || false;

//Connect DB
mongo.findBlocksService(false, (err, bs) => {
  
  if (args.prev)
    blockHeight = bs.blocks.first-1;
  else if (args.first)
    blockHeight = bs.blocks.first;
  else if (args.last)
    blockHeight = bs.blocks.last;
  else if (args.next)
    blockHeight = bs.blocks.last+1;
  else if (!blockHeight)
    blockHeight = args.b || args.block || (bs.blocks.last+1);

  console.log("FETCHING BLOCK: ", blockHeight);
  nis.getBlockByHeight(blockHeight).subscribe(block => {
    console.log("BLOCK FROM " + nis.networkName + ":", block.height);
    console.log(block);
    mongo.close();
  }, err => {
    console.log("Error fetching block!");
    mongo.close()
  });
});