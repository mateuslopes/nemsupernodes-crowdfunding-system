var nis = require('../core/niswrap');
// Initialize NEMLibrary for TEST_NET Network
nis.getBlockchainLastBlock().subscribe(block => {
    console.log(block);
});
