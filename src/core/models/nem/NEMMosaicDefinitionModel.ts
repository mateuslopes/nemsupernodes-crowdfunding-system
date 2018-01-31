export class NEMMosaicDefinitionModel {
    public data:any;
    
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