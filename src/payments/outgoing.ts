/*
This script searches for outgoing pending transactions of a supernode account
and responds to the sender with XSN or XEM unconfirmed transactions
*/
import { SupernodeModel } from '../app/models/SupernodeModel';
import {PaymentModel} from '../app/models/PaymentModel';
import {NEMAccountModel} from '../core/models/nem/NEMAccountModel';
import {NEMHelpers} from '../core/models/NEMHelpers';

//
var config = require('../app/config');
var mongo = require('../core/mongowrap');
var nis = require('../core/niswrap');
var assert = require('assert');
var args = require('optimist').argv;

//
var appAccount = nis.createCosigner('app');

var debug = false; 
var locked = false; // locks inserts and updates

// Connect DB
mongo.connect(function(err, client) {
  
  // gets the supernode configuration
  mongo.findSupernode(config.supernode.active, function(err, snData){
    assert.equal(null, err);

    //
    let supernode = new SupernodeModel(snData);
    supernode.dieIfInactive();

    // loads supernode account with pending and unconfirmed payments
    supernode.loadSupernodeAccount((err, sn) => {
      assert.equal(null, err);
      
      // Get payments
      var pays = supernode.pending.payments;
      // if supernode is locked, process only mosaics payments
      if (supernode.isLocked)
        pays = pays.filter(p=>(p.isMosaicOut));

      // 
      if (pays.length == 0) {
        console.log("No outgoing pending payments to process!");
        supernode.tryUnlockSupernode((err,result)=>{
          mongo.close();
          process.exit();
        });
        return;
      }

      //
      pays = [pays[0]];
      // for each pending payment
      pays.forEach( payment => {

        // Replace with the multisig account
        let multisigAccountPublicKey: string = payment.fromPublicKey;
        
        // Prepare transfer transaction
        let transfer;

        //
        if (payment.isMosaicOut) {
          let minXsnBalanceAllowed = 0;
          let authorized = true, status = "OK";
          let xsnAmount = payment.getMosaicQuantity(0);
          let xemAmount = payment.tx.xemAmount;
          let remainingBalance = supernode.xsnBalance - xsnAmount;

          if (supernode.xsnBalance <= (minXsnBalanceAllowed*1)){
            authorized = false;
            status = "insufficient-xsn-funds";

            // SEND ALL XEM BACK DISCOUNTING FEES
            payment.resetValues();
            let fee = supernode.calculateXemFee(xemAmount);
            payment.sendXEM(xemAmount - fee, fee);
            
            if (!locked){
              payment.save((err,res)=>{
                  console.log("XEM payment returned because of XSN insufficient funds.");
                  process.exit();
              });
              return;
            } else {
              console.log("Outgoing locked!");
              process.exit();
            }
            

          }
          else if (supernode.xsnBalance > minXsnBalanceAllowed && remainingBalance < minXsnBalanceAllowed){
            
            // if still have xsn balance, split the payment in two and send the remaining balance in XSN
            // while scheduling a XEM payment with the change 
            let sendXSN = NEMHelpers.roundXem(supernode.xsnBalance - minXsnBalanceAllowed);
            payment.updateMosaicQuantity(0, sendXSN); // todo: verify this multiplier or get it from mosaic definition

            // Create a copy of the actual payment, reset its values, and configure it to send change in XEM

            let sendXEM = NEMHelpers.roundXem(payment.tx.xemAmount - sendXSN);
            let sendXEMFee = sendXEM - payment.mosaicFee;
            sendXEMFee = NEMHelpers.roundXem(sendXEMFee - supernode.calculateXemFee(sendXEMFee));
            
            let payBack = payment.duplicate();
            payBack.resetValues();
            let fees = supernode.calculateXemFee(sendXEM)
            
            let xemFinalFee = supernode.calculateXemFee(sendXEMFee);
            payBack.sendXEM(sendXEMFee, xemFinalFee);

            // saves the new payments and ends this process to start it again
            if (!locked){
              payment.save((err,res)=>{
                payBack.save((err,res)=>{
                  console.log("Last XSN payment splitted in one XSN and other XEM payment.");
                  process.exit();
                });
              });
              return;
            } else {
              console.log("Outgoing locked!");
              process.exit();
            }

          } 

          if (authorized){
            transfer = nis.createTransferWithMosaics(payment.toAddress, [payment.mosaics[0]]);
          } else {
            console.log("Unauthorized XSN transaction:", status);
          }
        }











        //
        else if (payment.isXEMout){

          let xemAmount = payment.xemTotalCost;
          let remainingBalance = supernode.xemBalance - xemAmount;
          let authorized = true, status = "OK";

          // If supernode is unocked, authorize everything
          if (supernode.isUnlocked){
            authorized = true;
          }

          // if server was in supernode status before, and will lose this status
          else if (supernode.xemBalance >= supernode.minSupernode && remainingBalance < supernode.minSupernode){ 
            authorized = false;
            status = "supernode-split";
            // unauthorized transaction: supernode will lose supernode requirements
            if (supernode.xemBalance <= (supernode.minSupernode * 1.01)){
              authorized = false;
              status = "supernode-downgrade";
            } else {
              
              let splitPay = supernode.splitXEM(payment, xemAmount, supernode.xemBalance - supernode.minSupernode);
              
              // saves the new payments and ends this process to start it again
              if (!locked){
                supernode.saveSplitPayments(
                  splitPay, 
                  "Last XEM payment splitted in one XEM and other XSN payment.",
                  ()=>{process.exit();}
                );
                return;
              } else {
                console.log("Outgoing locked!");
                process.exit();
              }
            }
            
          }

          // if server was below supernode but with harvesting status before
          else if (supernode.xemBalance >= supernode.minHarvest && remainingBalance < supernode.minHarvest){ 
            authorized = false;
            status = "harvest-split";
            // unauthorized transaction: supernode will lose harvesting requirements
            if (supernode.xemBalance <= (supernode.minHarvest * 1.01)){
              authorized = false;
              status = "harvest-downgrade";
            } else {
              let splitPay = supernode.splitXEM(payment, xemAmount, supernode.xemBalance - supernode.minHarvest);
              // saves the new payments and ends this process to start it again
              if (!locked){
                supernode.saveSplitPayments(
                  splitPay, 
                  "Last XEM payment splitted in one XEM and other XSN payment.",
                  ()=>{process.exit();}
                );
                
                return;
              } else {
                console.log("Outgoing locked!");
                process.exit();
              }
            }
              


          }

          // Is server has no status but has balance
          else if (supernode.xemBalance >= 0 && remainingBalance < 0){
            authorized = false;
            status = "insufficient-xem-funds-split";
            // unauthorized transaction: insufficient funds
            if (supernode.xemBalance <= 1){
              authorized = false;
              status = "insufficient-xem-funds";
            } else {
              let splitPay = supernode.splitXEM(payment, xemAmount, supernode.xemBalance);

              // saves the new payments and ends this process to start it again
              if (!locked){
                supernode.saveSplitPayments(
                  splitPay, 
                  "Last XEM payment splitted in one XEM and other XSN payment.",
                  ()=>{process.exit();}
                );
                return;
              } else {
                console.log("Outgoing locked!");
                process.exit();
              }
            }
          }

          if (authorized){
            transfer = nis.createTransfer(payment.toAddress, payment.xemAmount);
          } else {
            console.log("Unauthorized XEM transaction:", status);
            if (status != "insufficient-xem-funds"){
              supernode.changeSupernodeStatus('LOCKED', status, (err,payments)=>{
                console.log("Supernode locked: "+status);
                process.exit();
              });
            }
          }
        }
        









        if (transfer){
          transfer.subscribe( transferTransaction => {
            
            let multisigTransaction = nis.createMultisign(transferTransaction, payment.fromPublicKey);
            let signedTx = appAccount.signTransaction(multisigTransaction);

            if (!locked && !args.noannounce){
              nis.announceTransaction(signedTx).subscribe( response => {
                console.log("###############");
                console.log("Payment announced!");
                console.log(response);
                console.log("###############");

                payment.unconfirmedPayment(response, function(err, result) {
                  assert.equal(null, err);
                  console.log("Payment UNCONFIRMED updated!");
                  let updateSupernodeValues = {
                    // 'payments.lastBlock': highestBlock,
                    'payments.lastDate': new Date()
                  };
                  mongo.c.supernodes.updateOne({nodeId: payment.data.nodeId}, updateSupernodeValues, (err, res) => {
                    console.log("Supernode updated!");
                    mongo.close();
                  });
                });
              },
              err => {
                console.log("Error announcing transaction to NIS!", err);
                process.exit();
              });
  
              } else {
                console.log("Transaction not announced!");
                process.exit();
              }
              return;
  
            },
            err => {
              console.log("Error preparing transfer object on NIS!", err);
              supernode.tryUnlockSupernode((err,result)=>{
                mongo.close();
                process.exit();
              });
              return;
            })
          } else {
            console.log("No transfer authorized!", err);
            supernode.tryUnlockSupernode((err,result)=>{
              mongo.close();
              process.exit();
            });
            return;
          }
        // Listen to transfer response
        
      }); // for each payment

    }); // supernode account

  }); // mongo supernode found

}); // mongo connect

