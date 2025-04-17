
// function to generate transaction id for wallet transactions
const generateTransactionId = () => {
    const timestamp = Date.now(); // current time in ms
    const random = Math.floor(1000 + Math.random() * 9000); // 4-digit random
    return `TXN-${timestamp}-${random}`;
  };

module.exports = {
    generateTransactionId
}