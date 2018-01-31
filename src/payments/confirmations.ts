/*
This script searchs for UNCONFIRMED payments of a supernode account
and confirms the payments in mongoDB when they are already confirmed by the blockchain
*/
import {SupernodeModel} from '../app/models/SupernodeModel';
import {PaymentModel} from '../app/models/PaymentModel';
import {Observable} from "rxjs/Observable";
//
var config = require('../app/config');
var mongo = require('../core/mongowrap');
var nis = require('../core/niswrap');
var assert = require('assert');
var args = require('optimist').argv;

//
var debug = false;
var locked = false; // locks inserts and updates

// Connect DB
mongo.connect(function(err, client) {

  // finds the supernode being confirmed
  mongo.findSupernode(config.supernode.active, function(err, snData){
    assert.equal(null, err);

    let supernode = new SupernodeModel(snData);
    supernode.dieIfInactive();
    
    // get all payments with UNCONFIRMED status from this supernode
    mongo.c.payments
    .find(
      {
        nodeId: supernode.nodeId, 
        dt_paid: null, 
        'status.value':'UNCONFIRMED'
      },
      {
        sort:'blockHeight'
      }
    )
    .limit(10)
    .toArray((err, paymentsData) => {
      assert.equal(null, err);

      // If no payments to confirm, ends here
      if (paymentsData.length == 0) {
        console.log("No unconfirmed payments to confirm!");
        mongo.close();
        return;
      }
      
      
      // If there are payments to confirm, then, gets all supernode outgoing payments
      nis.outgoingTransactions(supernode.address).subscribe( outgoing => {
        
        // counts the total processed unconfimed payments
        let countProcessed:number = 0;
        
        // Observable.from([()=>{
          paymentsData = [paymentsData[0]];  
        // for each of the payments to confirm 
          paymentsData.forEach( payData => {
            countProcessed++;
          
            // creates a payment model to analyze payment
            let payment = new PaymentModel(payData);

            // finds all outgoing transactions with the payment hash
            let filtered = payment.filterAnnouncedTransactions(outgoing);

            if (filtered.length > 0){
              // if outgoing is found and confirmed
              if (!locked && filtered[0].isConfirmed()){
                // confirm it in the database
                payment.confirmedPayment(
                  filtered[0].getTransactionInfo(), 
                  (err, results) => {
                    console.log("Payment confirmed!", payment.announcedHash);
                      mongo.close();
                  });
              }
            } 
            else {
                mongo.close();
            }
          });
        
        

      }, err => {
        console.log("Error fetching outgoing transactions from NIS.");
        mongo.close();
      });      

    }); // find mongo payments
  
  }); // find mongo supernode

}); // mongo connect
