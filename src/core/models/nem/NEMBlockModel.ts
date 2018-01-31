import {NEMTransactionModel} from './NEMTransactionModel';

export class NEMBlockModel {
    public data:any;
    constructor(data){
        this.data = data;
    }

    //
    public get height() {
        return this.data.height;
    }

    // filters txs by the recipients address
    public filterTxByRecipient(address, returnData = false){
        return this.data.transactions.filter(
            tx => {
                let txm = new NEMTransactionModel(tx);
                return (txm.hasRecipient && txm.recipient.value == address)
            }
        );
    }
    
    
    
    // filters txs by the signers address
    public filterTxBySigner(address, returnData = false){
        return this.data.transactions.filter(
            tx => {
                let txm = new NEMTransactionModel(tx);
                return (txm.hasSigner && txm.signer.address.value == address)
            }
        );
    }

}