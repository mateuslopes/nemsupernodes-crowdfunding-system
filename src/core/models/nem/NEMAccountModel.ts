import {NEMMosaicModel} from './NEMMosaicModel';

export class NEMAccountModel {
    
    protected _XEMDivisor:number = 1000000;

    public data:any;
    public mosaics:any = {
        owned: null,    
        created: null
    };

    constructor(accountData, mosaicsOwnedData = null){
        this.data = accountData;
        this.mosaics.owned = mosaicsOwnedData;
    }

    public get balance():number {
        return this.data.balance.balance/this._XEMDivisor;
    }

    public set balance(val:number) {
        this.data.balance.balance = val*this._XEMDivisor;
    }

    public get vested():number {
        return this.data.balance.vestedBalance/this._XEMDivisor;
    }
    
    public get unvested():number {
        return this.data.balance.unvestedBalance/this._XEMDivisor;
    }

    public get harvested():number {
        return this.data.harvestedBlocks;
    }

    public get address():string {
        return this.data.publicAccount.address.value;
    }

    public get publicKey():string {
        return this.data.publicAccount.address.publicKey;
    }

    public get isLocked():boolean {
        return this.data.status == "LOCKED";
    }

    public get isUnlocked():boolean {
        return this.data.status == "UNLOCKED";
    }
    
    public get isActive():boolean {
        return this.data.status == "ACTIVE";
    }

    public get isInactive():boolean {
        return this.data.status == "INACTIVE";
    }
    
    public get qtdCosigns():number {
        return this.data.cosignatories.length;
    }

    public get hasCosigns():boolean {
        return this.qtdCosigns > 0;
    }

    public get isMultisign():boolean {
        return this.qtdCosigns > 0;
    }


    public getMosaicOwned(mosaicId):any {
        return new NEMMosaicModel(this.mosaics.owned.filter(
            m => (m.mosaicId.namespaceId == mosaicId.namespaceId && m.mosaicId.name == mosaicId.name)
        )[0]);
    }

    


}