import Block from './Block.js';
import TSMBridge from '../../tsm/lib/Bridge.js';
import TransactionBuilder from './TransactionBuilder.js';

/// @dev Glue for everything.
export default class Bridge extends TSMBridge {
  constructor (options) {
    super(options, Block);

    this.transactionBuilder = new TransactionBuilder(options.typedData);
  }
}
