
var mongo = require('../../core/mongowrap');

mongo.connect(function(err, client) {

    // Security feature to preserve online storage from dumb executions
    const host = require('../config').mongo.host;

    if (host == 'localhost'){
        mongo.c.blocks_missing.remove(function(err, r) {
            mongo.c.blocks_service.remove(function(err, r) {
                console.log("Blocks service cleared!");
                mongo.c.blocks.remove(function(err, r) {
                    console.log("Blocks cleared!");
                    mongo.c.supernodes.remove(function(err, r) {
                        console.log("Supernodes cleared!");
                        mongo.close();
                    });
                });
            });
        });
    } else {
        mongo.c.blocks_missing.remove(function(err, r) {
            mongo.c.supernodes.remove(function(err, r) {
                console.log("Supernodes cleared!");
                mongo.close();
            });
        });
    }
    
});