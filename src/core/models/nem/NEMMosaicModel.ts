export class NEMMosaicModel {
    public data:any;
    constructor(data){
        this.data = data;
    }

    public get mosaicId():any {
        return this.data.mosaicId;
    }

    public get quantity():number {
        return this.data.quantity;
    }

    public set quantity(val: number) {
        this.data.quantity = val;
    }

    public get balance(): number {
        return this.quantity/1000000;
    }

    public set balance(val: number) {
        this.data.quantity = Math.round(val*1000000);
    }

    public getBalance(divisor):number {
        return this.quantity/divisor;
    }

}