import {NEMMosaicModel} from './NEMMosaicModel';
import {NEMFees} from './NEMFees';
import {NEMHelpers} from '../NEMHelpers';
import { PlainMessage } from 'nem-library';

export class NEMTransactionModel {
    public data:any;
    constructor(data){
        this.data = data;
    }

    

    // generic
    public get isSimple():boolean { return (this.data.type == 257); }
    public get isImportanceTransfer():boolean { return (this.data.type == 2049); }
    public get isConvertToMultisign():boolean { return (this.data.type == 4097); }
    public get isMultisignCosign():boolean { return (this.data.type == 4098); }
    public get isMultisign():boolean { return (this.data.type == 4100); }
    public get isNamespaceCreation():boolean { return (this.data.type == 8193); }
    public get isMosaicCreation():boolean { return (this.data.type == 16385); }
    public get isMosaicChangeSupply():boolean { return (this.data.type == 16386); }
    
    public get hasSignature():boolean {
        return (this.data.signature && this.data.signature.length > 0);
    }

    public get hasSignatures():boolean {
        return (this.data.signatures && this.data.signatures.length > 0);
    }

    public get hasOtherTransaction():boolean {
        return (this.data.otherTransaction && this.data.otherTransaction.type > 0);
    }

    public get signature() {
        return this.data.signature;
    }

    //
    public get issuer() {
        return this.data.signer;
    }

    //
    public get signer() {
        if (this.isSimple) return this.data.signer;
        else if (this.isMultisign) return this.data.otherTransaction.signer;
        return false;
    }

    public get hasSigner():boolean {
        return (this.signer && this.signer.address.value.length > 0);
    }
    
    //
    public get recipient() {
        if (this.isSimple) return this.data.recipient;
        else if (this.isMultisign) return this.data.otherTransaction.recipient;
        return false;
    }

    public get hasRecipient():boolean {
        return (this.recipient && this.recipient.value.length > 0);
    }







    //
    public get timeWindow() {
        if (this.isSimple) return this.data.timeWindow;
        else if (this.isMultisign) return this.data.otherTransaction.timeWindow;
        return false;
    }

    //
    public get _xem() {
        if (this.isSimple) return this.data._xem;
        else if (this.isMultisign) return this.data.otherTransaction._xem;
        return false;
    }

    //
    public get _mosaics() {
        if (this.isSimple) return this.data._mosaics;
        else if (this.isMultisign) return this.data.otherTransaction._mosaics;
        return false;
    }

    public get message() {
        if (this.isSimple) return this.data.message;
        else if (this.isMultisign) return this.data.otherTransaction.message;
        return false;
    }

    

    


    public get payload():string {
        return this.message.payload;
    }

    public get isMessagePlain():boolean {
        return (this.message.recipientPublicAccount === undefined);
    }

    public get isMessageEncrypted():boolean {
        return (this.message.recipientPublicAccount !== undefined);
    }

    public get messageText():string {
        return NEMHelpers.decodeHex(this.payload);
    }

    public get messageObject():any {
        return PlainMessage.create(NEMHelpers.decodeHex(this.payload));
    }

    

    public decryptedMessage(toPrivateKey:string):string{
        return NEMHelpers.decrypt(this.payload, toPrivateKey, this.signer.publicKey);
    }








    // total amount of xem sent directly in transaction (not including xem mosaics)
    public get xemAmount():number {
        if (this.hasMosaics) return 0;
        return this._xem.amount;
    }

    // return the NEM:XEM mosaic if included or false if not
    public get xemMosaic():any {
        let xemMosaic = this.filterMosaics({namespaceId: 'nem', name: 'xem'});
        return (xemMosaic != false) ? xemMosaic[0] : false;
    }

    // verifies if transaction has a Xem mosaic included
    public get hasXemMosaic():boolean {
        return (this.xemMosaic !== false && this.xemMosaic.quantity > 0);
    }

    // return total XEM or XEM mosaics value of the transaction
    public get totalXemAmount():number {
        if (this.hasXemMosaic) {
            return this.xemMosaic.balance;
        }
        return this.xemAmount;
    }

    public get hasXem():boolean {
        return (
            (this.xemAmount > 0 && !this.hasXemMosaic && !this.hasMosaics)
            ||
            (this.xemAmount == NEMFees.MOSAIC_XEM_DEFAULT_VALUE && this.hasXemMosaic)
        ) ? true : false;
    }

    // 
    public get hasMosaics():boolean {
        return (this._mosaics && this._mosaics.length > 0) ? true : false;
    }

    // verifies if mosaicId exists in transactions mosaics
    public hasMosaic(mosaicId):boolean {
        return (!this.filterMosaics(mosaicId)) ? false : true;
    }
    
    public get hasMessage():boolean {
        return (this.message && this.message.payload.length > 0);
    }

    public get hasOnlyXem():boolean { 
        return (this.xemAmount > 0 && !this.hasMosaics && !this.hasMessage); 
    }

    public get hasOnlyMessage():boolean { 
        return (this.totalXemAmount == 0 && !this.hasMosaics && this.hasMessage); 
    }









    

    private _dtFormat(dt):string{
        let d = dt._date, t = dt._time;
        return d._year+'-'+d._month+'-'+d._day+' '+t._hour+':'+t._minute+':'+t._second;
    }
    
    public get deadline():string { 
        return this._dtFormat(this.timeWindow.deadline); 
    }

    public get timestamp():string { return this._dtFormat(this.timeWindow.timeStamp); }

    
    
    
    
    
    
    //
    public get fee() {
        let fees = 0;
        if (this.isSimple){
            fees += this.data.fee;
        } 
        else if (this.isMultisign){
            fees += this.data.otherTransaction.fee;
        }
        return fees;
    }
    
    
    

    //
    public get multisignFee() {
        let fees = 0;
        if (this.isMultisign){
            fees += this.data.fee;
            if (this.hasSignatures){
                this.data.signatures.forEach(sgn => {
                    fees += sgn.fee;
                });
            }
        }
        return fees;
    }
    
    
    
    //
    public get totalFee() {
        return this.fee + this.multisignFee;
    }
    
    

    // filter and return mosaics with mosaicId in the transactions mosaics
    public filterMosaics(mosaicId):any { 
        var m = this._mosaics;
        if (!m || m.length == 0) return false;
        let all = [];
        m.forEach(msc => {
            if (msc.mosaicId.namespaceId == mosaicId.namespaceId && msc.mosaicId.name == mosaicId.name)
                all.push(new NEMMosaicModel(msc));
        });
        return (all.length > 0) ? all : false;
    }

    //
    public mosaicQuantity(mosaicId):any { 
        let mosaics = this.filterMosaics(mosaicId);
        let qty = 0;
        if (!mosaics || mosaics.length == 0) return qty;
        mosaics.forEach(msc => {
            qty += msc.balance;
        });
        return qty;
    }
    
}