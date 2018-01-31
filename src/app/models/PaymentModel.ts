import {NEMTransactionModel} from '../../core/models/nem/NEMTransactionModel';
import {NEMBlockModel} from '../../core/models/nem/NEMBlockModel';
import {NEMFees} from '../../core/models/nem/NEMFees';
import {Mosaic} from 'nem-library';
import {NEMHelpers} from '../../core/models/NEMHelpers';

var lodash = require('lodash');

export class PaymentModel {
    
    private _mongo = require('../../core/mongowrap');
    
    public data:any; // payment data
    public tx:any; // transaction

    constructor(data = null){
        if (data)
            this.initFromData(data);
    }

    public init(tx, blockHeight = null ){
        if (tx instanceof(NEMTransactionModel))
            this.tx = tx;
        else
            this.tx = new NEMTransactionModel(tx);
        this.data = this.getModel(blockHeight);
    }

    public initFromData(data){
        this.tx = new NEMTransactionModel(data.transaction);
        this.data = data;
    }

    public duplicate():PaymentModel{
        let newData = lodash.cloneDeep(this.data);
        delete newData._id;
        return new PaymentModel(newData);
    }


    public getModel(blockHeight:number):any{
        return {
            blockHeight: blockHeight,
            dt_cad: new Date(),
            dt_paid: null,
            nodeId: '',
            payment: {
              type: '',
              from: {
                  address: '',
                  publicKey: ''
              },
              to: {
                  address: this.tx.signer.address.value || ""
              },
              _xem: {
                amount: 0,
                fee: 0
              },
              _mosaicFee: 0,
              _mosaics: [],
            },
            status: {
                value: 'PENDING', // PENDING | UNCONFIRMED | CONFIRMED
                dt_lastChange: new Date(),
                announced: null, // the tx hash from the announcement response
                confirmed: null

            },
            supernode: null,
            transaction: this.tx.data || null,
            
        };
    }

    public get toAddress():string{
        return this.data.payment.to.address;
    }
    public set toAddress(val:string){
        this.data.payment.to.address = val;;
    }

    public get fromAddress():string{
        return this.data.payment.from.address;
    }
    public set fromAddress(val:string){
        this.data.payment.from.address = val;
    }

    public get fromPublicKey():string{
        return this.data.payment.from.publicKey;
    }
    public set fromPublicKey(val:string){
        this.data.payment.from.publicKey = val;
    }


    public get hasType():boolean{
        return this.data.payment.type.length > 0;
    }
    public get type():string{
        return this.data.payment.type;
    }
    public set type(type:string){
        this.data.payment.type = type;
    }
    


    public get xemAmount():number{
        return this.data.payment._xem.amount;
    }
    public set xemAmount(qtd:number){
        this.data.payment._xem.amount = qtd;
    }
    


    public get xemFee():number{
        return this.data.payment._xem.fee;
    }
    public set xemFee(qtd:number){
        this.data.payment._xem.fee = qtd;
    }

    public get xemTotalCost():number{
        return this.xemAmount + this.xemFee + this.mosaicFee;
    }
    


    public get mosaicFee():number{
        return this.data.payment._mosaicFee;
    }
    public set mosaicFee(qtd:number){
        this.data.payment._mosaicFee = qtd;
    }
   
    public get mosaics():any{
        return this.data.payment._mosaics;
    }

    public get mosaicsObjects():any{
        return this.data.payment._mosaics.map(msc => {
            return new Mosaic(msc.mosaicId, msc.quantity);
        });
    }

    public get hasMosaics():boolean{
        return this.mosaics.length > 0;
    }

    public get block():number{
        return this.data.blockHeight || this.data.block || 0;
    }

    public get isXEMout():boolean {
        let tp = this.type;
        return (tp == "XEM" || tp == 'sendXem') ? true : false;
    }


    public get isMosaicOut():boolean {
        let tp = this.type;
        return (tp == "MOSAIC" || tp == "XSN" || tp == 'SEND') ? true : false;
    }

    
    // verify if the payment is prepared correctly
    public get isPrepared():boolean {
        return (this.data && this.type > '') ? true : false;
    }

    
    public get hasAnnouncedHash():boolean{
        return (
            this.data.status 
            && this.data.status.announced 
            && this.data.status.announced.transactionHash
            && this.data.status.announced.transactionHash.data.length > 0
        );
    }

    // only multisigned have innerHash
    public get hasAnnouncedInnerHash():boolean{
        return (
            this.data.status 
            && this.data.status.announced 
            && this.data.status.announced.innerTransactionHash
            && this.data.status.announced.innerTransactionHash.data.length > 0
        );
    }

    // returns the announced hash of the payment
    public get announcedHash():string {
        if (this.hasAnnouncedInnerHash) // multisigned transfer
            return this.data.status.announced.innerTransactionHash.data;
        else if (this.hasAnnouncedHash) // simple transfer
            return this.data.status.announced.transactionHash.data;
        return "";
    }


    // filter only Txs with the same announcedHash of the payment
    public filterAnnouncedTransactions(txs):any[] {
        let announcedHash = this.announcedHash;
        if (!announcedHash) return [];
        return txs.filter( tx => {
            let info = tx.getTransactionInfo();
            return (
                (info.hash && info.hash.data == announcedHash) 
                || 
                (info.innerHash && info.innerHash.data == announcedHash));
        });
    }
    

    

    public getMosaicQuantity(index):number {
        if (!this.hasMosaics) return 0;
        return NEMHelpers.roundXem(this.mosaics[index].quantity);
    }

    // Updates the mosaic quantity by index
    public updateMosaicQuantity(index, quantity):boolean {
        if (!this.hasMosaics) return false;
        this.data.payment._mosaics[index].quantity = NEMHelpers.roundXem(quantity);
        return true;
    }


    


    // updates only some values of the payment
    public update(updateValues:any, callback){
        this._mongo.c.payments.updateOne({_id:this.data._id}, {$set: updateValues}, {
            upsert: true
        }, function(err, result) {
            if (callback)
                callback(err, result);
        });
    }


    // saves the whole payment object to the database
    public save(callback){
        if (this.data._id !== undefined){
            this._mongo.c.payments.updateOne(
                {_id:this.data._id}, 
                {'$set':this.data}, {
                upsert: false
            }, function(err, result) {
                console.log("Payment saved with update!");
                if (callback)
                    callback(err, result);
            });
        } else {
            this._mongo.c.payments.insertOne(
                this.data, 
                function(err, result) {
                    console.log("Payment saved with insert!");
                    if (callback)
                        callback(err, result);
                }
            );
        }
        
    }


    // updates this payment as unconfirmed
    public unconfirmedPayment(txHashes, callback){
        this._mongo.c.payments.updateOne(
            {_id:this.data._id}, 
            {$set: {
                'status.value': 'UNCONFIRMED',
                'status.dt_lastChange': new Date(),
                'status.announced': txHashes,
                'status.confirmed': null
            }}, 
            {
                upsert: true
            }, function(err, result) {
            if (callback)
                callback(err, result);
        });
    }

    // updates this payment as confirmed
    public confirmedPayment(txHashes, callback){
        this._mongo.c.payments.updateOne(
            {_id:this.data._id}, 
            {$set: {
                'dt_paid': new Date(),
                'status.value': 'CONFIRMED',
                'status.dt_lastChange': new Date(),
                'status.confirmed': txHashes
            }}, 
            {
                upsert: true
            }, function(err, result) {
            if (callback)
                callback(err, result);
        });
    }


    // resets only xem and mosaic values of the payment
    public resetValues(){
        this.type = "";
        this.xemAmount = 0;
        this.xemFee = 0;
        this.mosaicFee = 0;
        this.data.payment._mosaics = [];
    }

    // configures the payment to send XEM
    public sendXEM(amount, fee:number = 0):boolean{
        if (amount > 0){
            if (!this.hasType)
                this.type = "XEM";

            if (this.hasMosaics){
                this.data.payment._mosaics[0].quantity += this.mosaicFee;
                this.mosaicFee = fee;
                this.data.payment._mosaics.push({
                    quantity: amount,
                    mosaicId: {
                        namespaceId: 'nem',
                        name: 'xem'
                    }
                });
            } else {
                this.xemAmount = amount;
                this.xemFee = fee;
            }
            return true;
        }
        
        return false;
    }


    // configures the payment to send XSN
    public sendXSN(mosaicId, amount, fee:number = 0):boolean{
        if (amount > 0){
            this.data.payment._mosaics = [];
            // if there is XSN to send back, then send it as mosaic    
            if (!this.hasType)
                this.type = "MOSAIC";
            
            this.mosaicFee = fee;

            this.data.payment._mosaics.push(
                {
                    quantity: amount,
                    mosaicId: mosaicId
                }
            );
            return true;
        }
        return false;

    }




    
    


}