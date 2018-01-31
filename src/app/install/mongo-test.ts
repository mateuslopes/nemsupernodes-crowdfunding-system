
var mongo = require('../../core/mongowrap');

mongo.connect(function(err, client) {
    mongo.c.blocks_service.findOne({}, function(err, r) {
        console.log("MongoDB row found!", err, r);
        mongo.close();
    }); 
});