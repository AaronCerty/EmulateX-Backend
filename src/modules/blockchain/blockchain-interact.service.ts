import { Injectable, Logger } from '@nestjs/common';
import { Signature, TypedDataDomain, ethers, isAddress } from 'ethers';
import { copyTradingContractAbi } from 'src/constants/abi/CopyTrading';
import { usdcContractAbi } from 'src/constants/abi/USDC';
import {
  HyperliquidDepositPermitDomain,
  HyperliquidDepositPermitType,
} from 'src/modules/hyperliquid/dto/eip712-type.dto';
import { ApiConfigService } from 'src/shared/services/api-config.service';
import { addDecimal6 } from 'src/shared/utils/bignumber-utils';
import * as web3 from 'web3';

const MAX_UINT_256_1 = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

@Injectable()
export class BlockchainInteractService {
  private readonly logger = new Logger(BlockchainInteractService.name);
  private web3Instance: web3.Web3;
  private copyTradingContractAddress: string;
  private copyTradingContract: web3.Contract<web3.ContractAbi>;
  private usdcContract: web3.Contract<web3.ContractAbi>;
  private usdcContractAddress: string;
  private adminWallet;
  private hyperliquidBridgeAddress: string;

  constructor(private readonly configService: ApiConfigService) {
    this.copyTradingContractAddress = this.configService.getEnv('COPY_TRADING_CONTRACT_ADDRESS');
    this.web3Instance = new web3.Web3(this.configService.getEnv('ARBITRUM_RPC_URL'));
    this.usdcContractAddress = this.configService.getEnv('USDC_CONTRACT_ADDRESS');
    this.hyperliquidBridgeAddress = this.configService.getEnv('HYPERLIQUID_BRIDGE_ADDRESS');
    this.copyTradingContract = new this.web3Instance.eth.Contract(
      copyTradingContractAbi,
      this.copyTradingContractAddress,
    );
    this.usdcContract = new this.web3Instance.eth.Contract(usdcContractAbi, this.usdcContractAddress);
    this.adminWallet = this.web3Instance.eth.accounts.wallet.add(
      `0x${this.configService.getEnv('ADMIN_PRIVATE_KEY')}`,
    )[0];
  }

  async addWallet(privateKey: string) {
    const { address } = this.web3Instance.eth.accounts.wallet.add(privateKey)[0];
    this.logger.debug(`Added wallet ${address} to web3 instance`);
  }

  async removeWallet(publicKey: string) {
    this.web3Instance.eth.accounts.wallet.remove(publicKey);
    this.logger.debug(`Removed wallet ${publicKey} from web3 instance`);
  }

  async getBlockTimestamp(blockNumber: number) {
    return (await this.web3Instance.eth.getBlock(blockNumber)).timestamp;
  }

  getCopyTradingContractAddress() {
    return this.copyTradingContractAddress;
  }

  public getAdminWalletAddress() {
    if (!this.adminWallet) {
      throw new Error('Admin wallet not initialized');
    }
    return this.adminWallet.address;
  }

  public getWeb3Instance() {
    if (!this.web3Instance) {
      throw new Error('Web3 instance not initialized');
    }
    return this.web3Instance;
  }

  private checkFromToAddress(from: string, to: string) {
    if (!from || !isAddress(from)) {
      throw new Error('Invalid from address');
    }
    if (!to || !isAddress(to)) {
      throw new Error('Invalid to address');
    }
    if (!this.web3Instance.eth.accounts.wallet.get(from)) {
      throw new Error('From wallet is not added to web3 instance');
    }
  }

  private checkAddress(address: string) {
    if (!address || !isAddress(address)) {
      throw new Error('Invalid to address');
    }
  }

  private readonly gasMultiplier = 1.1; // 10% gas price bid
  private async getGasPrice() {
    const gasPrice = await this.web3Instance.eth.getGasPrice();
    this.logger.debug(`Gas price: ${gasPrice}. Using ${this.gasMultiplier} multiplier gas price bid`);
    return Math.floor(Number(gasPrice) * this.gasMultiplier).toString();
  }

  // *****
  // All blockchain interaction funtions to get data.
  // *****

  async getUSDCBalance(address: string) {
    this.checkAddress(address);
    return this.usdcContract.methods.balanceOf(address).call();
  }

  async getEthBalance(address: string) {
    this.checkAddress(address);
    return this.web3Instance.eth.getBalance(address);
  }

  async getUserBalanceOnCopyTradingContract(address: string) {
    this.checkAddress(address);
    const userBalanceContract = await this.copyTradingContract.methods
      .getUserTokenBalance(address, this.usdcContractAddress)
      .call();
    return userBalanceContract;
  }

  // *****
  // All blockchain interaction funtions to write transaction
  // *****

  async checkAllowanceAndSendApprove(from: string, amount: string) {
    // Check allowance to transfer
    let approve;
    const allowance = await this.usdcContract.methods.allowance(from, this.copyTradingContractAddress).call();
    if (Number(allowance) < Number(amount)) {
      this.logger.debug(`Approve USDC transfer from ${from} to ${this.copyTradingContractAddress} amount ${amount}.`);
      approve = await this.usdcContract.methods
        .approve(this.copyTradingContractAddress, MAX_UINT_256_1)
        .send({ from, gasPrice: await this.getGasPrice() });
      this.logger.debug(
        `Approved USDC transfer from ${from} to ${this.copyTradingContractAddress}. \nApprove TxHash ${approve.transactionHash}`,
      );
    } else {
      this.logger.debug(`USDC transfer from ${from} to ${this.copyTradingContractAddress} already approved`);
      approve = true;
    }
    return approve;
  }

  async transferUSDC(from: string, to: string, amount: string) {
    this.checkFromToAddress(from, to);

    this.logger.debug(`Transferring USDC from ${from} to ${to} amount ${amount}.`);
    const transfer = await this.usdcContract.methods
      .transfer(to, amount)
      .send({ from, gasPrice: await this.getGasPrice() });
    this.logger.debug(
      `Transferred USDC from ${from} to ${to} amount ${amount}.\nTransfer TxHash ${transfer.transactionHash}`,
    );

    return transfer;
  }

  async sendEthToWallet(from: string, to: string, amount: string) {
    this.checkFromToAddress(from, to);
    this.logger.debug(`Sending ETH from ${from} to ${to} amount ${amount}.`);
    const transaction = await this.web3Instance.eth.sendTransaction({
      from,
      to,
      value: web3.utils.toWei(amount, 'ether'),
      gasPrice: await this.getGasPrice(),
    });
    this.logger.debug(`Sent ETH from ${from} to ${to} amount ${amount}.\nTxHash ${transaction.transactionHash}`);
    return transaction;
  }

  async transferUserBalanceOnCopyTradingContract(userWalletAddress: string, fundWalletAddress: string, amount: string) {
    this.checkAddress(userWalletAddress);
    this.checkAddress(fundWalletAddress);

    const userBalanceOnChain = await this.getUserBalanceOnCopyTradingContract(userWalletAddress);
    if (Number(userBalanceOnChain) < Number(amount)) {
      throw new Error(`User onchain balance is not enough. Request ${amount}, User balance ${userBalanceOnChain}`);
    }

    this.logger.debug(
      `Transferring USDC from contract
      Contract Address ${this.copyTradingContractAddress}
      For user ${userWalletAddress}
      To funding wallet ${fundWalletAddress}
      Amount ${amount}
      User on chain balance: ${userBalanceOnChain}`,
    );
    const transfer = await this.copyTradingContract.methods
      .transferFundToUserWallet(userWalletAddress, fundWalletAddress, this.usdcContractAddress, amount)
      .send({ from: this.adminWallet.address, gasPrice: await this.getGasPrice() });
    this.logger.debug(
      `Transferred USDC from contract.
      Contract Address ${this.copyTradingContractAddress}
      For user ${userWalletAddress}
      To funding wallet ${fundWalletAddress}
      Amount ${amount}
      TxHash ${transfer.transactionHash}`,
    );
    return transfer;
  }

  async depositToHyperliquid(from: string, amount: string) {
    this.checkAddress(from);
    return this.transferUSDC(from, this.hyperliquidBridgeAddress, amount);
  }

  async depositToHyperLiquidWithPermit(
    walletAddress: string,
    walletPrivateKey: string,
    amount: number,
    userWalletAddress: string,
  ) {
    this.checkAddress(walletAddress);
    this.checkAddress(userWalletAddress);
    const amountInDecimal6 = addDecimal6(amount);

    const nonce = await this.usdcContract.methods.nonces(walletAddress).call();

    const deadline = Math.floor(new Date().getTime() / 1000 + 3600);

    const payload = {
      owner: walletAddress, // The address of the user with funds they want to deposit
      spender: this.hyperliquidBridgeAddress, // The address of the bridge
      value: amountInDecimal6.toString(),
      nonce: Number(nonce),
      deadline: deadline,
    };

    const wallet = new ethers.Wallet(walletPrivateKey);

    const data = await wallet.signTypedData(HyperliquidDepositPermitDomain, HyperliquidDepositPermitType, payload);

    const signature = Signature.from(data);

    var r = signature.r;
    var s = signature.s;
    var v = signature.v;

    const receipt = await this.copyTradingContract.methods
      .depositToHyperLiquidWithPermit(
        userWalletAddress,
        walletAddress,
        amountInDecimal6.toString(),
        this.usdcContractAddress,
        deadline,
        v,
        r,
        s,
      )
      .send({
        from: this.adminWallet.address,
      });
    this.logger.debug(`Deposit to hyperliquid with permit. TxHash: ${receipt.transactionHash}`);

    return receipt;
  }

  async getFeeWithdraw() {
    const feeInDecimal = await this.copyTradingContract.methods.feePercentage().call();
    return Number(feeInDecimal) / 10000;
  }

  async requestWithdrawalUSDC(user: string, amount: string) {
    const receipt = await this.copyTradingContract.methods
      .requestWithdrawal(user, this.usdcContractAddress, amount)
      .send({ from: this.adminWallet.address });
    this.logger.debug(`
      Request withdrawal USDC. 
      TxHash: ${receipt.transactionHash}
      User: ${user}
      Amount: ${amount}
      `);
    return receipt;
  }
}
