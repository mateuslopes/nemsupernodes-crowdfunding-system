var assert = require('assert');
var f = require('util').format;

export class MongoClass {
 
    private static _instance:MongoClass = new MongoClass();
 
    // private _score:number = 0;
    private _config = require('../../app/config').mongo;
    private _nis = require('../niswrap');
    private _client = require('mongodb').MongoClient;
    private _db;
    private _cli;

    // contains all collections objects
    public c:Object;
 
    constructor() {
        if(MongoClass._instance){
            throw new Error("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
        }
        MongoClass._instance = this;
    }
 

    public static getInstance():MongoClass
    {
        return MongoClass._instance;
    }
 


    public get db():any
    {
        return this._db;
    }

    public get cli():any
    {
        return this._cli;
    }
 

    // constructs a safe connection url with mongo config properties
    public connectUrl():string {
        let url = this._config.protocol;
        let isAuth = (this._config.auth.enabled);
        if (isAuth) {
            url += '%s:%s@';
        }
        url += this._config.host+":"+this._config.port+'/'+this._config.dbName;
        if (isAuth) {
            if (this._config.auth.authMechanism !== false){
                url += "?authMechanism=%s";
                return f(
                    url,
                    encodeURIComponent(this._config.auth.username), 
                    encodeURIComponent(this._config.auth.password), 
                    encodeURIComponent(this._config.auth.authMechanism)
                );
            }

            return f(
                url,
                encodeURIComponent(this._config.auth.username), 
                encodeURIComponent(this._config.auth.password)
            );
            
        } else {
            return url;
        }
    }



    // Use connect method to connect to the Server
    public connect(callback){
        if (this.connected()){
            callback(null, this._cli);
            return;
        }

        let self = this;
        let url = this.connectUrl();
        
        this._client.connect(url, function(err, cli) {
            assert.equal(null, err);
            self._cli = cli;
            self._db = self._cli.db(self._config.dbName);

            self.c = {
                blocks: self._db.collection('blocks'),
                blocks_service: self._db.collection('blocks_service'),
                blocks_missing: self._db.collection('blocks_missing'),
                supernodes: self._db.collection('supernodes'),
                payments: self._db.collection('payments')
            };

            if (callback)
                callback(err, cli);
        });
    }

    public connected():boolean{
        return (!this._cli && !this._db) ? false : true;
    }

    public close(){
        this._cli.close();
        this._cli = this._db = undefined;
    }

    
    // This method will be used as default callback for (err, result) => {} callback on mongo queries
    private _findDefaultCallback(errorCheck, callback) {
        var self = this;
        return (err, result) => {
            if (errorCheck) {
                assert.equal(null, err);
            }
            if (callback)
                callback(err, result);
        };
    }

    // generic find with error checking
    public find(collName, args, callback, errorCheck = true) {
        var self = this;
        this.connect((err, _cli)=>{
            if (errorCheck)
                assert.equal(null, err);
            this._db.collection(collName)
            .find(args, self._findDefaultCallback(errorCheck, callback));
        });
    }

    // generic findOne with error checking
    public findOne(collName, args, callback, errorCheck = true) {
        var self = this;
        this.connect((err, _cli)=>{
            if (errorCheck)
                assert.equal(null, err);
            this._db.collection(collName)
            .findOne(args, self._findDefaultCallback(errorCheck, callback));
        });
    }

    




    public findBlocks(args, callback) {
        this._db.collection('blocks')
        .find(args, {"sort": [["height","asc"]]}, this._findDefaultCallback(false, callback));
    }


    public findBlockByHeight(height, callback) {
        this.findOne('blocks', {height:height}, callback);
    }
    
    //

    public findBlocksService(network, callback) {
        network = (!network) ? this._nis.networkId : network;
        this.findOne('blocks_service', {network:network}, callback);
    }

    //

    public findSupernode(nodeId, callback) {
        this.findOne('supernodes', {nodeId:nodeId}, callback);
    }
    
 
}