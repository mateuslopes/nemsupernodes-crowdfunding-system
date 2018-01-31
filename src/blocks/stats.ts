var nis = require('../core/niswrap');
var mongo = require('../core/mongowrap');
var args = require('optimist').argv;

//Connect DB
mongo.findBlocksService(false, (err, bs) => {
  
  bs.blocks.total = bs.blocks.last - bs.blocks.first + 1;

  console.log("BLOCKS SERVICE:");
  console.log(bs);
  console.log("=========");
  
  mongo.c.blocks.count((err,count) => {
    console.log("BLOCKS ROW COUNT: ", count);
    console.log("=========");

    nis.getBlockchainLastBlock().subscribe(block => {
      console.log("LAST BLOCK FROM "+nis.networkName+": ");
      console.log(block);
      console.log("=========");
      mongo.close();
    },
  
    err => {
      console.log("Error fetching last blockchain block!");
      mongo.close();
    });

  });


});