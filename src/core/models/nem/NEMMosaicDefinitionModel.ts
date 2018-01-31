export class NEMMosaicDefinitionModel {
    public data:any;
    
    /*

    {
        "creator" : {
            "address" : {
                "value" : "TA6QD2BU4FTM7ZZKCXY6OUZWZZ7MFRUYAAIIQKSY",
                "networkType" : 152
            },
            "publicKey" : "0afb935c49484cd1d416142d15ee7c22d004e360c022a267e53422d878daafad"
        },
        "id" : {
            "namespaceId" : "nembr.sncf",
            "name" : "xsn2"
        },
        "description" : "The XSN (XEM Super Node) token is always paired to XEM value, that means 1 XSN = 1 XEM, as these tokens represents XEMs that are being hold by SuperNode accounts.",
        "properties" : {
            "initialSupply" : 33000,
            "supplyMutable" : true,
            "transferable" : true,
            "divisibility" : 6
        },
        "levy" : {
            "type" : 2,
            "recipient" : {
                "value" : "TATXXO52M6335SB6O5N57ZLSHW6QK7LSGNPNCL5H",
                "networkType" : 152
            },
            "mosaicId" : {
                "namespaceId" : "nem",
                "name" : "xem"
            },
            "fee" : 10
        },
        "metaId" : 1319
    }
     
     */

    constructor(data){
        this.data = data;
    }

    public get id():any{
        return this.data.id;
    }

    public get description():string{
        return this.data.description;
    }

    public get supply():number{
        return this.data.properties.initialSupply;
    }

    public get isMutable():boolean{
        return (this.data.properties.supplyMutable == true);
    }

    public get isTransferable():number{
        return this.data.properties.transferable;
    }

    public get divisibility():number{
        return this.data.properties.divisibility;
    }

    public get divisor():number {
        let d = this.divisibility;
        if (d == 6) return 1000000;
        else if (d == 5) return 100000;
        else if (d == 4) return 10000;
        else if (d == 3) return 1000;
        else if (d == 2) return 100;
        else if (d == 1) return 10;
        return 1;
    }


    public get isLevyAbsolute():boolean {
        return this.data.levy.type == 1;
    }

    public get isLevyPercentage():boolean {
        return this.data.levy.type == 2;
    }

    public get isLevyInXEM():boolean {
        return (this.data.levy.mosaicId.namespaceId == 'nem' && this.data.levy.mosaicId.name == 'xem');
    }

    public get levyRecipient():string{
        return this.data.levy.recipient.value;
    }

    public get levyFee():number{
        return this.data.levy.fee;
    }

}