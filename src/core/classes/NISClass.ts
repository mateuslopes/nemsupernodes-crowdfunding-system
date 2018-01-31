import { NEMLibrary, NetworkTypes } from "nem-library";
import { AccountHttp, BlockHttp, ChainHttp, MosaicHttp, TransactionHttp } from "nem-library";
import { BlockchainListener } from "nem-library";
import {
    Account, Address, TimeWindow, EmptyMessage,  PublicAccount, XEM,
    Transaction, TransferTransaction, MultisigTransaction, SignedTransaction,
    MosaicId
} from "nem-library";
import {Observable} from "rxjs/Observable";
import {NEMFees} from '../models/nem/NEMFees';


export class NISClass {
 
    // Singleton Definitions
    private static _instance:NISClass = new NISClass();

    private _privateKeys = require('../../app/config').signersPrivateKeys;
    
    private _accountHttp: AccountHttp; 
    private _blockHttp: BlockHttp; 
    private _chainHttp: ChainHttp;
    private _blockchainListener: BlockchainListener;
    private _mosaicHttp: MosaicHttp; 
    private _transactionHttp: TransactionHttp; 
    
    public nemFees = NEMFees.feesTable;

    constructor() {
        if(NISClass._instance){
            throw new Error("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
        }
        NISClass._instance = this;
    }

    public static getInstance():NISClass
    {
        return NISClass._instance;
    }

    private _config: any = require('../../app/config');
    private _network:number;
    private _bootstrapped:boolean = false;

    
    // constructs a safe connection url with mongo config properties
    public bootstrap(network?:string):void {
        if (!network) network = this._config.network;
        if (network == 'mainnet')
            this._network = NetworkTypes.MAIN_NET
        else if (network == 'testnet')
            this._network = NetworkTypes.TEST_NET
        NEMLibrary.bootstrap(this._network);
        this._bootstrapped = true;
    }








    public get networkId():string {
        return ((this.isMainnet) ? "mainnet" : "testnet");
    }

    public get networkName():string {
        return ((this.isMainnet) ? "MAIN_NET" : "TEST_NET");
    }

    public get bootstrapped():boolean {
        return this._bootstrapped;
    }

    public get isTestnet():boolean {
        return this._network == NetworkTypes.TEST_NET;
    }

    public get isMainnet():boolean {
        return this._network == NetworkTypes.MAIN_NET;
    }

    public get hosts():any {
        return this._config.nis.hosts;
    }

    public get hostsEnabled():boolean {
        return this._config.nis.enabled;
    }






    public get accountHttp():AccountHttp{
        if (!this._accountHttp){
            if (this.hostsEnabled)
                this._accountHttp = new AccountHttp(this.hosts);
            else
                this._accountHttp = new AccountHttp();
        }
        return this._accountHttp;
    }

    public get blockHttp():BlockHttp{
        if (!this._blockHttp){
            if (this.hostsEnabled)
                this._blockHttp = new BlockHttp(this.hosts);
            else
                this._blockHttp = new BlockHttp();
        }
        return this._blockHttp;
    }

    public get chainHttp():ChainHttp{
        if (!this._chainHttp){
            if (this.hostsEnabled)
                this._chainHttp = new ChainHttp(this.hosts);
            else
                this._chainHttp = new ChainHttp();
        }
        return this._chainHttp;
    }

    public get blockchainListener():BlockchainListener{
        if (!this._blockchainListener){
            if (this.hostsEnabled)
                this._blockchainListener = new BlockchainListener(this.hosts);
            else
                this._blockchainListener = new BlockchainListener();
        }
        return this._blockchainListener;
    }

    public get mosaicHttp():MosaicHttp{
        if (!this._mosaicHttp){
            if (this.hostsEnabled)
                this._mosaicHttp = new MosaicHttp(this.hosts);
            else
                this._mosaicHttp = new MosaicHttp();
        }
        return this._mosaicHttp;
    }

    public get transactionHttp():TransactionHttp{
        if (!this._transactionHttp){
            if (this.hostsEnabled)
                this._transactionHttp = new TransactionHttp(this.hosts);
            else
                this._transactionHttp = new TransactionHttp();
        }
        return this._transactionHttp;
    }






    public getAccount(address:string):any{
        return this.accountHttp.getFromAddress(new Address(address));
    }

    public outgoingTransactions(address:string, params?:any):any{
        return this.accountHttp.outgoingTransactions(new Address(address), params);
    }

    public getMosaicsOwned(address:string):any{
        return this.accountHttp.getMosaicOwnedByAddress(new Address(address));
    }

    public getMosaicDefinition(namespace:string, name:string):any{
        return this.mosaicHttp.getMosaicDefinition(new MosaicId(namespace, name));
    }
    

    public getBlockchainLastBlock():any{
        return this.chainHttp.getBlockchainLastBlock();
    }

    public getBlockByHeight(height):any{
        return this.blockHttp.getBlockByHeight(height);
    }

    

    public createTransfer(toAddress, xemAmount, message = EmptyMessage):Observable<TransferTransaction>{
        return Observable.from([
            TransferTransaction.create(
                TimeWindow.createWithDeadline(),
                new Address(toAddress),
                new XEM(xemAmount),
                message
            )
        ]);
    }

    public createTransferWithMosaics(toAddress, mosaics, message = EmptyMessage):Observable<TransferTransaction>{
        var self = this;
        let preparedMosaics = [];
        mosaics.forEach(msc => {
            preparedMosaics.push({
                mosaic: new MosaicId(msc.mosaicId.namespaceId, msc.mosaicId.name), 
                quantity: msc.quantity
            });
        });

        return Observable.from(preparedMosaics)
            .flatMap(_ => self.mosaicHttp.getMosaicTransferableWithAmount(_.mosaic, _.quantity))
            .toArray()
            .map(mosaics => TransferTransaction.createWithMosaics(
                TimeWindow.createWithDeadline(),
                new Address(toAddress),
                mosaics,
                EmptyMessage
            )
        );
    }
    

    public createMultisign(transferTransaction, multisigAccountPublicKey):any{
        return MultisigTransaction.create(
            TimeWindow.createWithDeadline(),
            transferTransaction,
            PublicAccount.createWithPublicKey(multisigAccountPublicKey)
        );
    }


    public accountCreateWithPrivateKey(privateKey) {
        return Account.createWithPrivateKey(privateKey);
    }

    public createCosigner(privKeyName) {
        if (!this._privateKeys[privKeyName]) return false;
        return this.accountCreateWithPrivateKey(this._privateKeys[privKeyName]);
    }


    public announceTransaction(signedTransaction){
        return this.transactionHttp.announceTransaction(signedTransaction);
    }

 
}