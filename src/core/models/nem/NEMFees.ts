export class NEMFees {
    
    // The cost for each 10.000 XEM on simple transfers
    public static SIMPLE_TRANSFER_COST_PER_XEM_QUANTITY:number = 10000;
    public static SIMPLE_TRANSFER:number = 0.05;

    // The fee charged for mosaics transactions
    public static MOSAIC_TRANSFER:number = 0.75;

    // The fee charged for mosaics transactions
    public static MOSAIC_ADDITIONAL:number = 0.05;
    
    // the total value sent in default _xem field on mosaic transactions
    public static MOSAIC_XEM_DEFAULT_VALUE:number = 1;
    
    // the cost of each signature in a transaction
    public static COST_PER_SIGNATURE:number = 0.15;

    public static MESSAGE_CHAR_GROUP_LENGTH:number = 32;
    public static MESSAGE_COST_PER_CHAR_GROUP_LENGTH:number = 0.05;

    public static MESSAGE_MAX_LENGTH_UNENCRYPTED:number = 1024;
    public static MESSAGE_MAX_LENGTH_ENCRYPTED:number = 960;
    public static MESSAGE_MAX_LENGTH_HEXA:number = 2048;

    
    public static get feesTable():any {
        return {
            SIMPLE_TRANSFER: this.SIMPLE_TRANSFER,
            MOSAIC_TRANSFER: this.MOSAIC_TRANSFER,
            MOSAIC_ADDITIONAL: this.MOSAIC_ADDITIONAL,
            MOSAIC_XEM_DEFAULT_VALUE: this.MOSAIC_XEM_DEFAULT_VALUE,
            COST_PER_SIGNATURE: this.COST_PER_SIGNATURE
        };
    }

    // calculates the fee costs a transaction with a message
    public static messageFee(message:string, type:string = 'unencrypted'):number {
        if (message.length == 0) return 0;

        let maxFee = 0, charsPerGroup = 0;
        switch(type){
            case 'unencrypted': 
                message = message.substr(0,this.MESSAGE_MAX_LENGTH_UNENCRYPTED); 
                charsPerGroup = this.MESSAGE_CHAR_GROUP_LENGTH;
                maxFee = 1.65;
                break;
            case 'encrypted': 
                message = message.substr(0,this.MESSAGE_MAX_LENGTH_ENCRYPTED); 
                charsPerGroup = this.MESSAGE_CHAR_GROUP_LENGTH;
                maxFee = 1.55;
                break;
            case 'hexa': 
                message = message.substr(0,this.MESSAGE_MAX_LENGTH_HEXA); 
                return this.hexaFees(message);
        }
        
        let qtdGroups = (Math.floor(message.length / charsPerGroup))+1;
        if (type == 'hexa'){
            if (message.length <= 61) return 0.05;
            else if (message.length <= 125) return 0.10;
        }
        let fee = Math.round((qtdGroups * this.MESSAGE_COST_PER_CHAR_GROUP_LENGTH) * 100)/100;
        return (fee >= maxFee) ? maxFee : fee;
    }

    // calculates the fee costs of a transaction according to the xem quantity
    public static xemFeePerQuantity(quantity:number):number {
        if (quantity < (this.SIMPLE_TRANSFER_COST_PER_XEM_QUANTITY * 2)) 
            return this.SIMPLE_TRANSFER;
        let qtd = (Math.floor((quantity-this.SIMPLE_TRANSFER_COST_PER_XEM_QUANTITY) / this.SIMPLE_TRANSFER_COST_PER_XEM_QUANTITY));
        let fee = Math.round((qtd * this.SIMPLE_TRANSFER) * 100)/100;
        return (fee >= 1.20) ? 1.20 : fee;
    }

    public static hexaFees(message:string):number {
        var l = message.length;
        if (l == 0) return 0;
        else if (l <= 61) return 0.05;
        else if (l <= 125) return 0.10;
        else if (l <= 189) return 0.15;
        else if (l <= 253) return 0.20;
        else if (l <= 317) return 0.25;
        else if (l <= 381) return 0.30;
        else if (l <= 445) return 0.35;
        else if (l <= 509) return 0.40;
        else if (l <= 573) return 0.45;
        else if (l <= 637) return 0.50;
        else if (l <= 701) return 0.55;
        else if (l <= 765) return 0.60;
        else if (l <= 829) return 0.65;
        else if (l <= 893) return 0.70;
        else if (l <= 957) return 0.75;
        else if (l <= 1021) return 0.80;
        else if (l <= 1085) return 0.85;
        else if (l <= 1149) return 0.90;
        else if (l <= 1213) return 0.95;
        else if (l <= 1277) return 1.00;
        else if (l <= 1341) return 1.05;
        else if (l <= 1405) return 1.10;
        else if (l <= 1469) return 1.15;
        else if (l <= 1533) return 1.20;
        else if (l <= 1597) return 1.25;
        else if (l <= 1661) return 1.30;
        else if (l <= 1725) return 1.35;
        else if (l <= 1789) return 1.40;
        else if (l <= 1853) return 1.45;
        else if (l <= 1917) return 1.50;
        else if (l <= 1981) return 1.55;
        else return 1.60;
    }

}