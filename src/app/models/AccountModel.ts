import {NEMAccountModel} from '../../core/models/nem/NEMAccountModel';

export class AccountModel extends NEMAccountModel {
    
    constructor(account, mosaics){
        super(account, mosaics);
    }

}