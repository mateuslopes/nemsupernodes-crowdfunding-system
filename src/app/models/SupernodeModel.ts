import { AccountModel } from './AccountModel';
import { NEMMosaicDefinitionModel } from '../../core/models/nem/NEMMosaicDefinitionModel';
import { NEMFees } from '../../core/models/nem/NEMFees';
import {NEMHelpers} from '../../core/models/NEMHelpers';
import { PaymentModel } from './PaymentModel';

export class SupernodeModel {
    

    public data:any;

    private _mongo = require('../../core/mongowrap');
    private _nis = require('../../core/niswrap');
    public mosaic:NEMMosaicDefinitionModel;

    public account:any;
    public mosaicsOwned:any;
    
    public pending:any = {
                xem: {in:0, out:0},
                xsn: {in:0, out:0},
                payments:[]
            };

    public unconfirmed:any = {
                xem: {in:0, out:0},
                xsn: {in:0, out:0},
                payments:[]
            };

    constructor(data){
        if (data){
            this.data = data;
            this.mosaic = new NEMMosaicDefinitionModel(this.data.mosaic.definition);
        }
    }
    
    public get minHarvest():number { return this.data.xem.minHarvestBalance; }
    public get minHarvestUnlockPoolRate():number { return this.data.xem.minHarvestUnlockPoolRate; }
    public get minSupernode():number { return this.data.xem.minSupernodeBalance; }
    public get minSupernodeUnlockPoolRate():number { return this.data.xem.minSupernodeUnlockPoolRate; }
    public get address():string { return this.data.address; }
    public get publicKey():string { return this.data.publicKey; }
    public get privateKey():string { return this.data.privateKey; }
    public get nodeId():string { return this.data.nodeId; }
    public get mosaicId():any { return this.mosaic.id; }
    public get mosaicBaseFee():number { return this.data.mosaic.mosaicBaseFee; }
    public get incomingAuthorizedAccounts():any { return this.data.incoming.authorizedAccounts; }
    
    public get mosaicPath():string{
        return this.mosaicId.namespaceId + "." + this.mosaicId.name;
    }

    public get status():string { return this.data.status.value; }
    public get isActive():boolean { return this.status == 'ACTIVE'; }
    public get isInactive():boolean { return this.status == 'INACTIVE'; }
    public get isLocked():boolean { return this.status == 'LOCKED'; }
    public get isUnlocked():boolean { return this.status == 'UNLOCKED'; }

    public dieIfInactive():void{
        if (this.isInactive) {
            console.log("Supernode is inactive! Process interrupted.");
            process.exit();
        }
    }

    
    public get xemBalance():number {
        return this.account.balance - this.unconfirmed.xem.out;
    }

    public get xsnBalance():number {
        return this.mosaicsOwned.balance - this.unconfirmed.xsn.out;
    }

    public get xsnCirculation():number {
        return this.mosaic.supply - this.mosaicsOwned.balance;
    }

    public get xemProfit():number {
        return this.account.balance - this.xsnCirculation;
    }

    



    public incomingBlocksQuery():any {
        return {
            "height": { $gt: this.data.incoming.lastBlock},
            "transactions": {$not: {$size:0}}, 
            $or: [
                {
                    "transactions.recipient.value": this.address
                },
                {
                    "transactions.otherTransaction.recipient.value": this.address
                }
            ],
        };
    }

    public signaturesFee():number {
        return this.data.signers.minimumSignatures * this._nis.nemFees.COST_PER_SIGNATURE;
    }

    public verifyMosaic(mosaicId):boolean {
        return (
            this.mosaicId.namespaceId == mosaicId.namespaceId
            &&
            this.mosaicId.name == mosaicId.name
        );
    }


    public removeAuthorizedSigners(transactions){
        return transactions.filter(
            tx => (
                this.incomingAuthorizedAccounts.findIndex( acc => (acc==tx.signer.address.value) ) == -1
            )
        );
    }


    public findAcccountByPublicKey(pubKey:string, returnObj:boolean = false):any {
        let idx = this.data.accounts.findIndex( acc => (acc.account.publicKey == pubKey));
        if (idx > -1 && returnObj) 
            return this.data.accounts[idx];
        return idx;
    }

    public addAccount(account:any, email:string = ''):boolean {
        let dt_now = new Date();
        let found = this.findAcccountByPublicKey(account.publicKey, false);
        
        if (found == -1) {
            this.data.accounts.push({
                dt_cad: dt_now,
                account: account,
                email: {
                    value: email,
                    dt_upd: dt_now,
                    history: [
                        {email: email, dt_cad: dt_now}
                    ]
                }
            });
            return true;
        } else {
            if (email.length > 0){
                this.data.accounts[found].email.value = email;
                this.data.accounts[found].email.dt_upd = dt_now;
                if (this.data.accounts[found].email.history.findIndex( eml => (eml.email == email)) == -1){
                    this.data.accounts[found].email.history.push({email: email, dt_cad: dt_now});
                }
            }
        }
        return false;
    }

    




    public findRepresentativeCandidatesByPublicKey(pubKey:string, returnObj:boolean = false):any {
        let idx = this.data.representative.candidates.findIndex( acc => (acc.account.publicKey == pubKey));
        if (idx > -1 && returnObj) 
            return this.data.representative.candidates[idx];
        return idx;
    }

    public addRepresentativeCandidate(account:any):boolean {
        let dt_now = new Date();        
        let found = this.findRepresentativeCandidatesByPublicKey(account.publicKey, false);

        if (found == -1) {
            this.data.representative.candidates.push({
                dt_cad: dt_now,
                account: account
            });
            return true;
        }
        return false;
    }


    public removeRepresentativeCandidate(signer:any):any {
        this.data.representative.candidates = this.data.representative.candidates.filter( 
            acc => (acc.account.publicKey != signer.publicKey)
        );
        return this.data.representative.candidates;
    }

    public removeAccountEmail(signer:any):boolean {
        let acc = this.data.accounts.filter( 
            acc => (acc.account.publicKey == signer.publicKey)
        );
        if (acc.length == 0) return false;
        acc[0].email.value = '';
        return true;
    }





    public saveResources(callback) {
        let params = {
            'accounts': this.data.accounts,
            'representative.candidates': this.data.representative.candidates
        };
        this._mongo.c.supernodes
        .updateOne({nodeId:this.nodeId}, {$set: params}, {
            upsert: true
        }, function(err, result) {
            callback(err, result);
        });
    }





    public updateIncomingBlock(height, callback) {
        this._mongo.c.supernodes
        .updateOne({nodeId:this.nodeId}, {$set: {'incoming.lastBlock': height}}, {
            upsert: true
        }, function(err, result) {
            callback(err, result);
        });
    }

    public update(updateValues:any, callback){
        this._mongo.c.supernodes.updateOne({nodeId:this.data.nodeId}, {$set: updateValues}, {
            upsert: true
        }, function(err, result) {
            if (callback)
                callback(err, result);
        });
    }

    public changeSupernodeStatus(newStatus, message = '', callback) {
        this._mongo.c.supernodes
        .updateOne(
            {nodeId:this.nodeId}, 
            {
                $set: {
                    'status.value': newStatus, 
                    'status.dt_lastChange': new Date(),
                    'status.message': message
                }
            }, 
            {
                upsert: true
            }, function(err, result) {
            callback(err, result);
        });
    }





    //
    public signFromPayment(pay){
        pay.fromAddress = this.address;
        pay.fromPublicKey = this.data.publicKey;
        pay.data.nodeId = this.data.nodeId;
        return pay;
    }


    public calculateXemFee(amount):number{
        return this.signaturesFee() + NEMFees.xemFeePerQuantity(amount);
    }

    public calculateMosaicFee(amount:number=0):number{
        return this.signaturesFee() + this.mosaicBaseFee;
    }


    // prepare a payment to send XSN
    public prepareSendXSN(pay){

        // Calculates initial fee, amount and returning xem values
        let fee = this.calculateMosaicFee();
        let xsnAmount = NEMHelpers.roundXem(pay.tx.totalXemAmount - fee);

        if (xsnAmount < 0) {
            console.log("Not enough XEM for a valid XSN payment response");
            return false;
        }

        if (pay.sendXSN(this.mosaicId, xsnAmount, fee)){
            return this.signFromPayment(pay);
        }
        return false;
    }


    

    // prepare a payment to send XEM
    // public prepareSendXEM(pay, account){
    public prepareSendXEM(pay){

        // searches if there is a supernode mosaic on the transactions _mosaics
        let mosaicIn = pay.tx.filterMosaics(this.mosaicId);
        if (!mosaicIn){
            console.log("Supernode mosaic not found on transaction mosaics!");
            return false;
        }
        let xsnAmount = (mosaicIn[0].getBalance(this.mosaic.divisor));
        let fee = this.calculateXemFee(xsnAmount);
        if (pay.hasMosaics){
            fee = pay.mosaicFee + this._nis.nemFees.MOSAIC_ADDITIONAL;
        }
        let xemAmount = NEMHelpers.roundXem(xsnAmount - fee);
        
        if (xemAmount <= 0){
            console.log("Not enough XSN for a valid XEM payment response");
            return false;
        }

        if (pay.sendXEM(xemAmount, fee)){
            return this.signFromPayment(pay);
        }
        return false;
    }

    

    public getPendingPayments():any{
        return this._mongo.c.payments.find({
            'nodeId': this.nodeId,
            dt_paid: null, 
            'status.value': 'PENDING'
        }, {sort:'blockHeight'});
    }

    public loadPendingPayments(callback):any {
        this.getPendingPayments().toArray((err,results)=>{
            this.pending = {
                xem: {in:0, out:0},
                xsn: {in:0, out:0},
                payments:[]
            };
            results.forEach(row => {
                let pay = new PaymentModel(row);
                this.pending.xem.in += pay.tx.xemAmount;
                this.pending.xsn.in += pay.tx.mosaicQuantity(this.mosaicId);
                this.pending.xem.out += pay.xemTotalCost;
                this.pending.xsn.out += pay.getMosaicQuantity(0);
                this.pending.payments.push(pay);
            });
            if (callback) callback(err,this.pending.payments)
        });
    }




    public getUnconfirmedPayments():any{
        return this._mongo.c.payments.find(
            {
                nodeId: this.nodeId, 
                dt_paid: null, 
                'status.value':'UNCONFIRMED'
            },
            {sort:'blockHeight'}
        );
    }

    public loadUnconfirmedPayments(callback):any {
        this.getUnconfirmedPayments().toArray((err,unconfirmedPayments)=>{
            this.unconfirmed = {
                xem: {in:0, out:0},
                xsn: {in:0, out:0},
                payments:[]
            };

            if (unconfirmedPayments.length > 0){
                unconfirmedPayments.forEach(payData=>{
                    let pay = new PaymentModel(payData);
                    this.unconfirmed.xem.in += pay.tx.xemAmount;
                    this.unconfirmed.xsn.in += pay.tx.mosaicQuantity(this.mosaicId);
                    this.unconfirmed.xem.out += pay.xemTotalCost;
                    this.unconfirmed.xsn.out += pay.getMosaicQuantity(0);
                    this.unconfirmed.payments.push(pay);
                });
            }
            callback(err, this.unconfirmed.payments);
        });
    }





    public loadSupernodeAccount(callback):void{
        
        this.loadPendingPayments((err,pending)=>{
            this.loadUnconfirmedPayments((err,unconfirmed)=>{
                // get account balances from nis
                this._nis.getAccount(this.address).subscribe(accData => {
                    // get supernode mosaic owned balances from nis
                    this._nis.getMosaicsOwned(this.address).subscribe(mscData => {
                        this.account = new AccountModel(accData, mscData);
                        this.mosaicsOwned = this.account.getMosaicOwned(this.mosaicId);

                        this._mongo.c.supernodes
                        .updateOne({nodeId:this.nodeId}, {$set: {
                            'account.dt_lastChange': new Date(),
                            'account.snapshot': accData,
                            'mosaicsOwned.dt_lastChange': new Date(),
                            'mosaicsOwned.snapshot': mscData
                        }}, {
                            upsert: true
                        }, function(err, result) {
                            callback(err,null);
                        });
                        
                    }, err => {
                        console.log("Error fetching account mosaics info from NIS!", err);
                        callback(err,null);
                    });
                }, err => {
                    console.log("Error fetching account info from NIS!", err);
                    callback(err,null);
                });
            });
        });

    }



    public get canPendingUnlockHarvesting():boolean {
        return this.isLocked && this.data.status.message == 'harvest-downgrade' && (this.pending.xem.out/this.minHarvest) > this.minHarvestUnlockPoolRate;
    }

    public get canPendingUnlockSupernode():boolean {
        return this.isLocked && this.data.status.message == 'supernode-downgrade' && (this.pending.xem.out/this.minSupernode) > this.minSupernodeUnlockPoolRate;
    }

    public get canBalanceUnlockHarvesting():boolean {
        return this.isLocked && this.data.status.message == 'harvest-downgrade' && this.pending.xem.out < (this.xemBalance - this.minHarvest);
    }

    public get canBalanceUnlockSupernode():boolean {
        return this.isLocked && this.data.status.message == 'supernode-downgrade' && this.pending.xem.out < (this.xemBalance - this.minSupernode);
    }

    public get canUnlock():boolean{
        return (
            this.canPendingUnlockHarvesting 
            || this.canPendingUnlockSupernode
            || this.canBalanceUnlockHarvesting
            || this.canBalanceUnlockSupernode
        );
    }
   

    public tryUnlockSupernode(callback){
        if (this.isLocked) {
            console.log("Supernode is " + this.status+"! No outgoing allowed. Accumulating pending payments.");
            console.log("Pending balances XEM: ", this.pending.xem.out, "XSN: ", this.pending.xsn.out);
            console.log("Pending balance can unlock harvesting?", 
            this.canPendingUnlockHarvesting, 
            this.pending.xem.out+"/"+this.minHarvest+" or "+((this.pending.xem.out/this.minHarvest)*100) + "%");
            console.log("Pending balance can unlock supernode?", 
            this.canPendingUnlockSupernode, 
            this.pending.xem.out+"/"+this.minSupernode+" or "+((this.pending.xem.out/this.minSupernode)*100) + "%");

            if (this.canUnlock){
              this.changeSupernodeStatus('UNLOCKED', 'processing-pending-payments', (err,payments)=>{
                console.log("Supernode UNLOCKED");
                if (callback) callback(err, "Supernode UNLOCKED");
              });
            } else {
                if (callback) callback(null, false);
            }
        } else if (this.isUnlocked){
            if (this.pending.xem.out == 0 && this.pending.xsn.out == 0){
                this.changeSupernodeStatus('ACTIVE', 'OK', (err,payments)=>{
                    console.log("Supernode ACTIVATED!");
                    if (callback) callback(err, "Supernode ACTIVATED!");
                });
            } else {
                if (callback) callback(null, false);
            }
        } 
        else {
            if (callback) callback(null, false);
        }
    }


    public splitXEM(payment, xemAmount, xemBalance){
        let sendXEM = NEMHelpers.roundXem(xemBalance);
        let fee = this.calculateXemFee(sendXEM);
        let mosaicFee = this.calculateMosaicFee(sendXEM);
        payment.xemAmount = NEMHelpers.roundXem(sendXEM - fee - mosaicFee);
        payment.xemFee = fee;

        // Create a copy of the actual payment, reset its values, and configure it to send change in XEM
        let sendXSN =  NEMHelpers.roundXem(xemAmount - sendXEM);
        let payBack = payment.duplicate();
        payBack.resetValues();
        
        //
        payBack.sendXSN(this.mosaicId, sendXSN, mosaicFee);
        return {pay: payment, payBack:payBack};
    }

    public saveSplitPayments(splitPay, message, callback){
        splitPay.pay.save((err,res)=>{
            splitPay.payBack.save((err,res)=>{
                console.log(message);
                callback();
            });
        });
    }

}